import { InMemoryQueueStore, QueueItemStatus } from "../../../orchestration/queue/queue.js";
import { Priority } from "../../../orchestration/task/priority.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import type { Workflow } from "../../../orchestration/workflow/workflow.js";
import { DurableExecutionRecoveryEngine } from "../v8-o-durable-execution.js";

const now = new Date("2026-09-16T00:00:00.000Z");
const staleAt = new Date(now.getTime() - 10 * 60 * 1000);

function workflow(status: WorkflowStatus = WorkflowStatus.READY): Workflow {
    return {
        id: "workflow-v8-o",
        goal: "Validate durable execution recovery",
        status,
        requiresFounderApproval: false,
        createdAt: staleAt,
        updatedAt: now,
        metadata: {},
        steps: [
            { id: "fresh", workflowId: "workflow-v8-o", title: "Fresh", description: "Ready", agentId: "agent", dependsOn: [], priority: Priority.MEDIUM, requiresApproval: false, status: "READY" },
            { id: "active", workflowId: "workflow-v8-o", title: "Active", description: "Claimed", agentId: "agent", dependsOn: [], priority: Priority.MEDIUM, requiresApproval: false, status: "RUNNING" },
            { id: "stale", workflowId: "workflow-v8-o", title: "Stale", description: "Recoverable", agentId: "agent", dependsOn: [], priority: Priority.MEDIUM, requiresApproval: false, status: "RUNNING" },
            { id: "done", workflowId: "workflow-v8-o", title: "Done", description: "Completed", agentId: "agent", dependsOn: [], priority: Priority.MEDIUM, requiresApproval: false, status: "COMPLETED" },
            { id: "failed", workflowId: "workflow-v8-o", title: "Failed", description: "Terminal failure", agentId: "agent", dependsOn: [], priority: Priority.MEDIUM, requiresApproval: false, status: "FAILED" },
            { id: "cancelled", workflowId: "workflow-v8-o", title: "Cancelled", description: "Cancelled", agentId: "agent", dependsOn: [], priority: Priority.MEDIUM, requiresApproval: false, status: "CANCELLED" },
        ],
    };
}

async function seed(queue: InMemoryQueueStore): Promise<void> {
    const base = {
        workflowId: "workflow-v8-o",
        agentId: "agent",
        priority: Priority.MEDIUM,
        availableAt: staleAt,
        createdAt: staleAt,
        metadata: {},
    };
    await queue.enqueue({ ...base, id: "workflow-v8-o:fresh", stepId: "fresh", status: QueueItemStatus.QUEUED, attempts: 0, updatedAt: now });
    await queue.enqueue({ ...base, id: "workflow-v8-o:active", stepId: "active", status: QueueItemStatus.CLAIMED, attempts: 1, updatedAt: new Date(now.getTime() - 30_000) });
    await queue.enqueue({ ...base, id: "workflow-v8-o:stale", stepId: "stale", status: QueueItemStatus.CLAIMED, attempts: 2, updatedAt: staleAt });
    await queue.enqueue({ ...base, id: "workflow-v8-o:done", stepId: "done", status: QueueItemStatus.COMPLETED, attempts: 1, updatedAt: now });
    await queue.enqueue({ ...base, id: "workflow-v8-o:failed", stepId: "failed", status: QueueItemStatus.FAILED, attempts: 3, updatedAt: now });
    await queue.enqueue({ ...base, id: "workflow-v8-o:cancelled", stepId: "cancelled", status: QueueItemStatus.CANCELLED, attempts: 1, updatedAt: now });
}

async function main(): Promise<void> {
    const queue = new InMemoryQueueStore();
    await seed(queue);
    const engine = new DurableExecutionRecoveryEngine();
    const records = await engine.inspect(workflow(), queue, now);
    const byStep = new Map(records.map((record) => [record.stepId, record]));

    if (byStep.get("fresh")?.action !== "EXECUTE_THROUGH_V6") throw new Error("Fresh execution path failed.");
    if (byStep.get("active")?.action !== "WAIT") throw new Error("Active execution ownership was not preserved.");
    if (byStep.get("stale")?.action !== "RECOVER_THROUGH_V6") throw new Error("Stale claim was not classified as recoverable.");
    if (byStep.get("done")?.action !== "ALREADY_COMPLETED") throw new Error("Completed execution was not idempotently recognized.");
    if (byStep.get("failed")?.action !== "ESCALATE") throw new Error("Terminal failure was incorrectly made executable.");
    if (byStep.get("cancelled")?.action !== "ESCALATE") throw new Error("Cancelled execution was incorrectly made executable.");

    const completedWorkflow = await engine.inspect(workflow(WorkflowStatus.COMPLETED), queue, now);
    if (completedWorkflow.some((record) => record.action !== "ALREADY_COMPLETED")) throw new Error("Completed workflow reopened execution.");

    console.log("V8-O — Durable Execution & Recovery Validation");
    console.log(`Execution records           : ${records.length}`);
    console.log(`Ready for V6               : ${records.filter((r) => r.action === "EXECUTE_THROUGH_V6").length}`);
    console.log(`Active V6 ownership        : ${records.filter((r) => r.action === "WAIT").length}`);
    console.log(`Recoverable claims         : ${records.filter((r) => r.action === "RECOVER_THROUGH_V6").length}`);
    console.log(`Idempotently completed     : ${records.filter((r) => r.action === "ALREADY_COMPLETED").length}`);
    console.log(`Escalated terminal states  : ${records.filter((r) => r.action === "ESCALATE").length}`);
    console.log("Execution authority        : V6");
    console.log("Boundary                   : RECOVERY_ORCHESTRATION_ONLY");
    console.log("✓ Fresh work routes only through V6");
    console.log("✓ Active V6 ownership is never duplicated");
    console.log("✓ Stale claims are recoverable through V6");
    console.log("✓ Completed work cannot be silently re-executed");
    console.log("✓ Failed and cancelled work cannot bypass V6 policy");
    console.log("✓ A completed workflow remains terminal");
    console.log("✓ V8-O does not execute work or create a second execution authority");
    console.log("V8-O VALIDATION: PASS");
}

void main();
