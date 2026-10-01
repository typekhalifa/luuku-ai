import assert from "node:assert/strict";

import { AgentResult } from "../../../shared/agents/interface";
import { registerAgent } from "../../../shared/agents/registry";
import { Priority } from "../../task/priority";
import { InMemoryQueueStore } from "../../queue/queue";
import { QueueScheduler } from "../../scheduler/scheduler";
import { SharedAgentWorkflowExecutor } from "../shared-agent-workflow-executor";
import { AutonomousRuntime } from "../autonomous-runtime";
import { Workflow } from "../workflow";
import { WorkflowOrchestrator } from "../workflow-orchestrator";
import { WorkflowStatus } from "../workflow-status";

const executed: string[] = [];

registerAgent({
    id: "v6-autonomous-runtime-agent",
    name: "V6 Autonomous Runtime Agent",
    role: "controlled V6 runtime test agent",
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

const workflow: Workflow = {
    id: "v6-autonomous-runtime-demo",
    goal: "Run one autonomous V6 company cycle.",
    status: WorkflowStatus.READY,
    steps: [
        {
            id: "research-company",
            title: "Research Company X",
            description: "Execute controlled research.",
            agentId: "v6-autonomous-runtime-agent",
            capability: "research.company",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "READY",
            input: { company: "Company X" },
        },
    ],
    requiresFounderApproval: false,
    metadata: { source: "v6-autonomous-runtime-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const queue = new InMemoryQueueStore();
    const scheduler = new QueueScheduler(queue);
    const orchestrator = new WorkflowOrchestrator(
        undefined,
        new SharedAgentWorkflowExecutor(),
    );
    const runtime = new AutonomousRuntime(scheduler, queue, orchestrator);

    const cycle = await runtime.runCycle(workflow, now);

    assert.deepEqual(cycle.scheduled, ["v6-autonomous-runtime-demo:research-company"]);
    assert.deepEqual(cycle.claimed, ["v6-autonomous-runtime-demo:research-company"]);
    assert.deepEqual(cycle.executed, ["research-company"]);
    assert.deepEqual(cycle.completed, ["v6-autonomous-runtime-demo:research-company"]);
    assert.deepEqual(executed, ["research-company"]);
    assert.equal(workflow.steps[0].status, "COMPLETED");

    const queueItem = await queue.get("v6-autonomous-runtime-demo:research-company");
    assert.equal(queueItem?.status, "COMPLETED");

    console.log("");
    console.log("========================================");
    console.log("       V6 AUTONOMOUS RUNTIME DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Scheduled : ${cycle.scheduled.join(", ")}`);
    console.log(`Claimed   : ${cycle.claimed.join(", ")}`);
    console.log(`Executed  : ${cycle.executed.join(", ")}`);
    console.log(`Workflow  : ${workflow.steps[0].status}`);
    console.log(`Queue     : ${queueItem?.status}`);
    console.log("");
    console.log("✓ Runtime scheduled runnable workflow work automatically.");
    console.log("✓ Runtime claimed work through the queue.");
    console.log("✓ Runtime dispatched work through the orchestrator and shared executor.");
    console.log("✓ Agent completion advanced workflow and queue state.");
    console.log("✓ One runtime cycle completed without founder coordination.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
