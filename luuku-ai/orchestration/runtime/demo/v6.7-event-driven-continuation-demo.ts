import assert from "node:assert/strict";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { WorkflowOrchestrator } from "../../workflow/workflow-orchestrator.js";
import { AutonomousRuntime } from "../../workflow/autonomous-runtime.js";
import { RuntimeEventBus } from "../runtime-events.js";
import { WorkflowStatus } from "../../workflow/workflow-status.js";
import { Priority } from "../../task/priority.js";

const workflowId = `v6.7-event-driven-${Date.now()}`;
const workflow = {
    id: workflowId, goal: "research then prepare proposal", status: WorkflowStatus.READY,
    requiresFounderApproval: false, createdAt: new Date(), updatedAt: new Date(), metadata: {},
    steps: [
        { id: "research-company", title: "Research company", description: "Research", agentId: "research", dependsOn: [], priority: Priority.HIGH, requiresApproval: false, status: "READY" as const },
        { id: "prepare-proposal", title: "Prepare proposal", description: "Proposal", agentId: "sales", dependsOn: ["research-company"], priority: Priority.MEDIUM, requiresApproval: false, status: "PENDING" as const },
    ],
};

let executions = 0;
const executor = { async execute(step: typeof workflow.steps[number]) {
    executions++;
    return { success: true, summary: `${step.id} completed`, completedAt: new Date().toISOString(), executed: true, verified: true, executionStatus: "completed" as const, evidence: { provider: "demo", externalId: step.id } };
} };

async function main() {
    const queue = new InMemoryQueueStore();
    const scheduler = new QueueScheduler(queue);
    const events = new RuntimeEventBus();
    const runtime = new AutonomousRuntime(scheduler, queue, new WorkflowOrchestrator(undefined, executor), undefined, { events });
    const eventsSeen: string[] = [];
    events.on("workflow.step.completed", async event => { eventsSeen.push(`${event.stepId}:completed`); });

    const first = await runtime.runCycle(workflow);
    assert.deepEqual(first.completed, [`${workflowId}:research-company`]);
    assert.deepEqual(eventsSeen, ["research-company:completed"]);
    assert.deepEqual(first.scheduled, [`${workflowId}:research-company`, `${workflowId}:prepare-proposal`]);
    const dependent = await queue.get(`${workflowId}:prepare-proposal`);
    assert.equal(dependent?.status, QueueItemStatus.QUEUED);
    assert.equal(executions, 1);

    const second = await runtime.runCycle(workflow, new Date(Date.now() + 2_000));
    assert.deepEqual(second.completed, [`${workflowId}:prepare-proposal`]);
    assert.equal(executions, 2);

    console.log(""); console.log("========================================"); console.log(" V6.7 EVENT-DRIVEN CONTINUATION DEMO"); console.log("========================================"); console.log("");
    console.log("Research        : COMPLETED → event emitted");
    console.log("Dependent step  : prepare-proposal → QUEUED automatically");
    console.log("Next cycle      : prepare-proposal → COMPLETED");
    console.log("");
    console.log("✓ Step completion emitted a runtime event.");
    console.log("✓ Workflow dependencies were re-evaluated after completion.");
    console.log("✓ The dependent step became runnable and was queued without manual scheduling.");
    console.log("✓ The dependent step executed exactly once on the next runtime cycle.");
    console.log("✓ No external provider or network request was used."); console.log("");
}
main();
