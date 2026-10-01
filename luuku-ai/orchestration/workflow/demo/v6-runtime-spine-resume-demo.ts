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
    id: "v6-resume-agent",
    name: "V6 Resume Agent",
    role: "controlled V6 runtime resume test agent",
    async execute(task): Promise<AgentResult> {
        executed.push(task.id);
        return {
            success: true,
            summary: `Controlled resume agent completed ${task.id}.`,
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
    id: "v6-runtime-spine-resume-demo",
    goal: "Resume queued Company X work after a simulated restart.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Execute controlled research after restart.",
            agentId: "v6-resume-agent",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-runtime-spine-resume-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const step = workflow.steps[0];

    console.log("");
    console.log("========================================");
    console.log("      V6 RUNTIME SPINE RESUME DEMO");
    console.log("========================================");
    console.log("");

    const scheduled = await scheduler.schedule({
        id: "v6-resume-queue-item",
        workflowId: workflow.id,
        stepId: step.id,
        agentId: step.agentId,
        availableAt: now,
        priority: step.priority,
        metadata: { source: "resume-after-restart" },
    });

    // Simulate a process restart: the queue survives and the workflow is reconstructed.
    const restartedWorkflow: Workflow = {
        ...workflow,
        steps: workflow.steps.map((currentStep) => ({ ...currentStep })),
        metadata: { ...workflow.metadata, restarted: true },
    };

    const recovered = await queue.get(scheduled.id);
    assert.equal(recovered?.status, QueueItemStatus.QUEUED);

    const claimed = await queue.claimNext(now);
    assert.equal(claimed?.id, scheduled.id);

    const result = await orchestrator.runReadySteps(restartedWorkflow);
    const agentResult = result.results[step.id];

    await queue.complete(scheduled.id, new Date("2026-08-27T10:00:01.000Z"));
    const completed = await queue.get(scheduled.id);

    assert.deepEqual(result.executedStepIds, [step.id]);
    assert.equal(agentResult?.success, true);
    assert.equal(agentResult?.verified, true);
    assert.equal(restartedWorkflow.steps[0].status, "COMPLETED");
    assert.equal(completed?.status, QueueItemStatus.COMPLETED);
    assert.deepEqual(executed, [step.id]);

    console.log(`Scheduled : ${scheduled.id}`);
    console.log(`Recovered : ${recovered?.status}`);
    console.log(`Claimed   : ${claimed?.id}`);
    console.log(`Executed  : ${result.executedStepIds.join(", ")}`);
    console.log(`Workflow  : ${restartedWorkflow.steps[0].status}`);
    console.log(`Queue     : ${completed?.status}`);
    console.log("");
    console.log("✓ Queued work survived the simulated process restart.");
    console.log("✓ Recovered work was claimed exactly once.");
    console.log("✓ Orchestrator resumed execution through the shared agent boundary.");
    console.log("✓ Workflow and queue reached COMPLETED state.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
