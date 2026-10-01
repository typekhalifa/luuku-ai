import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { registerAgent } from "../../../shared/agents/registry";
import { Priority } from "../../task/priority";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue";
import { QueueScheduler } from "../../scheduler/scheduler";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { Workflow } from "../workflow";
import { WorkflowOrchestrator } from "../workflow-orchestrator";
import { WorkflowStatus } from "../workflow-status";

const executed: string[] = [];

registerAgent({
    id: "v6-runtime-loop-agent",
    name: "V6 Runtime Loop Agent",
    role: "controlled V6 runtime integration test agent",
    async execute(task): Promise<AgentResult> {
        executed.push(task.id);
        return {
            success: true,
            summary: `Controlled runtime agent completed ${task.id}.`,
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v6-agent",
                externalId: task.id,
                details: { networkRequestMade: false },
            },
        };
    },
});

const now = new Date("2026-08-27T10:00:00.000Z");
const queue = new InMemoryQueueStore();
const scheduler = new QueueScheduler(queue);
const orchestrator = new WorkflowOrchestrator(
    undefined,
    new SharedAgentWorkflowExecutor(),
);

const workflow: Workflow = {
    id: "v6-end-to-end-runtime-loop-demo",
    goal: "Schedule and execute Company X research through the V6 runtime spine.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Execute controlled research.",
            agentId: "v6-runtime-loop-agent",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-end-to-end-runtime-loop-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const step = workflow.steps[0];

    console.log("");
    console.log("========================================");
    console.log("     V6 END-TO-END RUNTIME LOOP DEMO");
    console.log("========================================");
    console.log("");

    const scheduled = await scheduler.schedule({
        id: "v6-runtime-loop-item",
        workflowId: workflow.id,
        stepId: step.id,
        agentId: step.agentId,
        availableAt: now,
        priority: step.priority,
        metadata: { workflowStep: step.id },
    });

    assert.equal(scheduled.status, QueueItemStatus.QUEUED);

    const claimed = await queue.claimNext(now);
    assert.equal(claimed?.id, scheduled.id);
    assert.equal(claimed?.status, QueueItemStatus.CLAIMED);

    const orchestration = await orchestrator.runReadySteps(workflow);
    const result = orchestration.results[step.id];

    await queue.complete(scheduled.id, new Date("2026-08-27T10:00:01.000Z"));
    const completedQueueItem = await queue.get(scheduled.id);

    assert.deepEqual(orchestration.executedStepIds, [step.id]);
    assert.equal(result?.success, true);
    assert.equal(result?.executed, true);
    assert.equal(result?.verified, true);
    assert.equal(step.status, "COMPLETED");
    assert.equal(completedQueueItem?.status, QueueItemStatus.COMPLETED);
    assert.deepEqual(executed, [step.id]);

    console.log(`Scheduled : ${scheduled.id}`);
    console.log(`Claimed   : ${claimed?.id}`);
    console.log(`Agent     : ${step.agentId}`);
    console.log(`Executed  : ${orchestration.executedStepIds.join(", ")}`);
    console.log(`Workflow  : ${step.status}`);
    console.log(`Queue     : ${completedQueueItem?.status}`);
    console.log("");
    console.log("✓ Scheduler made workflow work eligible.");
    console.log("✓ Queue claimed the eligible work.");
    console.log("✓ Orchestrator executed the workflow through the shared agent boundary.");
    console.log("✓ Agent completion advanced the workflow state.");
    console.log("✓ Queue completion recorded the execution lifecycle.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
