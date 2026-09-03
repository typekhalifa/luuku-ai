import assert from "node:assert/strict";

import type { AgentResult } from "../../../shared/agents/interface.js";
import { registerAgent } from "../../../shared/agents/registry.js";
import { Priority } from "../../../orchestration/task/priority.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";
import type { Workflow } from "../../../orchestration/workflow/workflow.js";
import type { WorkflowStepExecutor } from "../../../orchestration/workflow/workflow-orchestrator.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";
import { InMemoryExecutiveLoopCheckpointStore } from "../executive-loop-checkpoint.js";
import { PersistentExecutiveLoop } from "../persistent-executive-loop.js";

const workflowId = `failed-work-${Date.now()}`;
let executions = 0;

const recoveryAgent = {
    id: "recovery-agent",
    name: "Recovery Agent",
    role: "recovers failed work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Failed work was recovered successfully.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: { provider: "controlled-v7.8k-agent", externalId: `recovery-${executions}` },
        };
    },
};

registerAgent(recoveryAgent);

const agentRegistry = new AgentRegistry();
agentRegistry.register({ agent: recoveryAgent, capabilities: ["work.recover"] });

const workflowStore = new InMemoryWorkflowStore();
const queueStore = new InMemoryQueueStore();

const failedWorkflow: Workflow = {
    id: workflowId,
    goal: "Recover a failed customer workflow.",
    status: WorkflowStatus.FAILED,
    steps: [{
        id: "failed-step",
        title: "Recover failed work",
        description: "The original operation failed and needs executive recovery.",
        agentId: "recovery-agent",
        capability: "work.recover",
        dependsOn: [],
        priority: Priority.HIGH,
        requiresApproval: false,
        status: "FAILED",
        input: { source: "controlled-failure" },
    }],
    requiresFounderApproval: false,
    metadata: { source: "v7.8k-demo" },
    createdAt: new Date("2026-09-03T05:00:00.000Z"),
    updatedAt: new Date("2026-09-03T05:00:00.000Z"),
};

async function main() {
    await workflowStore.create(failedWorkflow);

    const capabilityResolver = new CapabilityResolver(new AgentDiscovery(agentRegistry));
    const cycleOptions = {
        capabilities: { RECOVER_FAILED_WORK: "work.recover" },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS" as const,
            reason: "Recovery is explicitly safe to execute autonomously.",
        }],
        executeRuntime: true,
    };

    const controlledExecutor: WorkflowStepExecutor = {
        async execute(): Promise<AgentResult> {
            return recoveryAgent.execute();
        },
    };

    const cycle = new AutonomousExecutiveCycle(
        workflowStore,
        queueStore,
        capabilityResolver,
        { ...cycleOptions, workflowExecutor: controlledExecutor },
    );
    const checkpointStore = new InMemoryExecutiveLoopCheckpointStore();
    const loop = new PersistentExecutiveLoop(cycle, checkpointStore);

    const first = await loop.run({ cycle: cycleOptions, maxCycles: 1 }, new Date("2026-09-03T05:00:10.000Z"));
    const second = await loop.run({ cycle: cycleOptions, maxCycles: 1 }, new Date("2026-09-03T05:00:20.000Z"));

    assert.equal(first.cycles.length, 1);
    assert.equal(first.cycles[0].intentResults.length, 1);
    assert.equal(first.cycles[0].runtime?.completed.length, 1);
    assert.equal(second.cycles.length, 1);
    assert.equal(second.cycles[0].intentResults.length, 0);
    assert.equal(executions, 1);

    const checkpoint = await checkpointStore.load();
    assert.equal(checkpoint.cycleCount, 2);
    assert.equal(checkpoint.handledIntentKeys.length, 1);

    const workflows = await workflowStore.list();
    const queues = await queueStore.list();
    const recoveryWorkflow = workflows.find((workflow) => workflow.id.startsWith("execution-intent-plan-"));

    assert.ok(recoveryWorkflow);
    assert.equal(recoveryWorkflow.status, WorkflowStatus.COMPLETED);
    assert.equal(queues.length, 1);
    assert.equal(queues[0].status, "COMPLETED");

    console.log("");
    console.log("V7.8-K PERSISTENT AUTONOMOUS EXECUTIVE LOOP DEMO");
    console.log(`First loop       : ${first.cycles[0].runtime?.completed.length ?? 0} execution completed`);
    console.log(`Second loop      : ${second.cycles[0].intentResults.length} new intent actions`);
    console.log(`Executions       : ${executions}`);
    console.log(`Checkpoint       : ${checkpoint.handledIntentKeys.length} handled intent`);
    console.log(`Recovery state   : ${recoveryWorkflow.status}`);
    console.log(`Queue state      : ${queues[0].status}`);
    console.log("");
    console.log("✓ The executive loop can be invoked repeatedly without re-executing handled recovery intent.");
    console.log("✓ Stable failed-work identity prevents historical failures from becoming duplicate recovery actions.");
    console.log("✓ Checkpoint state survives repeated loop invocations and records handled intent identity.");
    console.log("✓ V6 remains the execution authority and executes the recovery exactly once.");
    console.log("✓ The recovered workflow and canonical queue item remain durably completed.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
