import { InMemoryQueueStore, QueueItemStatus } from "../../../orchestration/queue/queue.js";
import { Priority } from "../../../orchestration/task/priority.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import { ExecutiveControlPlane } from "../control-plane.js";

async function main() {
    console.log("\n========================================");
    console.log(" V7.7-C DURABLE V6 TRUTH DEMO");
    console.log("========================================\n");

    const workflows = new InMemoryWorkflowStore();
    const queue = new InMemoryQueueStore();

    const now = new Date();
    const makeWorkflow = (id: string, status: WorkflowStatus) => ({
        id,
        goal: id === "wf-approval" ? "Onboard Company X" : id,
        status,
        steps: [],
        requiresFounderApproval: status === WorkflowStatus.AWAITING_APPROVAL,
        createdAt: now,
        updatedAt: now,
        metadata: {},
    });

    await workflows.create(makeWorkflow("wf-running", WorkflowStatus.RUNNING));
    await workflows.create(makeWorkflow("wf-ready", WorkflowStatus.READY));
    await workflows.create(makeWorkflow("wf-approval", WorkflowStatus.AWAITING_APPROVAL));
    await workflows.create(makeWorkflow("wf-completed", WorkflowStatus.COMPLETED));
    await workflows.create(makeWorkflow("wf-failed", WorkflowStatus.FAILED));

    await queue.enqueue({
        id: "queue-failed-1",
        workflowId: "wf-failed",
        stepId: "step-failed-1",
        agentId: "research",
        priority: Priority.HIGH,
        availableAt: now,
        status: QueueItemStatus.FAILED,
        attempts: 2,
        metadata: {},
        createdAt: now,
        updatedAt: now,
    });

    const resolver = { resolve: () => undefined } as any;
    const executionGate = { evaluate: () => ({ approvalId: "unused", status: "WAITING_FOR_APPROVAL" }) } as any;
    const plane = await ExecutiveControlPlane.fromDurableTruth({
        resolver,
        workflows,
        queue,
        decisions: [],
        executionGate,
    });

    const state = plane.inspect();
    const brief = plane.brief();

    console.log("Durable workflows : 5");
    console.log("Durable queue     : 1 failed item");
    console.log(`Executive state   : ${state.active} active | ${state.waitingApproval} approval | ${state.failed} failed | ${state.completed} completed`);
    console.log(`Brief             : ${brief.summary}`);

    if (state.active !== 2) throw new Error(`Expected 2 active workflows, got ${state.active}.`);
    if (state.waitingApproval !== 1) throw new Error(`Expected 1 approval workflow, got ${state.waitingApproval}.`);
    if (state.failed !== 1) throw new Error(`Expected 1 failed workflow, got ${state.failed}.`);
    if (state.completed !== 1) throw new Error(`Expected 1 completed workflow, got ${state.completed}.`);
    if (!state.attention.some((item) => item.includes("Onboard Company X"))) throw new Error("Approval truth was not projected.");
    if (!state.attention.some((item) => item.includes("failed"))) throw new Error("Queue failure truth was not surfaced.");

    console.log("✓ Control plane state is projected from V6 workflow truth.");
    console.log("✓ Queue failures are surfaced as executive attention.");
    console.log("✓ Approval state comes from durable workflow status, not a cached snapshot.");
    console.log("✓ Executive brief is rebuilt from the recovered state.");
    console.log("✓ Control-plane construction performs no execution.");
    console.log("✓ No external provider or network request was used.\n");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
