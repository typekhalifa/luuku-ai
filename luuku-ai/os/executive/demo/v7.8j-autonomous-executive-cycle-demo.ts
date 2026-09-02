import assert from "node:assert/strict";

import type { AgentResult } from "../../../shared/agents/interface.js";
import { registerAgent } from "../../../shared/agents/registry.js";
import { Priority } from "../../../orchestration/task/priority.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";
import type { Workflow } from "../../../orchestration/workflow/workflow.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";

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
            evidence: {
                provider: "controlled-v7.8j-agent",
                externalId: `recovery-${executions}`,
            },
        };
    },
};

registerAgent(recoveryAgent);

const agentRegistry = new AgentRegistry();
agentRegistry.register({
    agent: recoveryAgent,
    capabilities: ["work.recover"],
});

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
    metadata: { source: "v7.8j-demo" },
    createdAt: new Date("2026-09-02T19:00:00.000Z"),
    updatedAt: new Date("2026-09-02T19:00:00.000Z"),
};

async function main() {
    await workflowStore.create(failedWorkflow);

    const cycle = new AutonomousExecutiveCycle(
        workflowStore,
        queueStore,
        new CapabilityResolver(new AgentDiscovery(agentRegistry)),
        {
            capabilities: { RECOVER_FAILED_WORK: "work.recover" },
            policyRules: [{
                capability: "work.recover",
                decision: "AUTONOMOUS",
                reason: "Recovery is explicitly safe to execute autonomously.",
            }],
            executeRuntime: true,
        },
    );

    const result = await cycle.run({
        capabilities: { RECOVER_FAILED_WORK: "work.recover" },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS",
            reason: "Recovery is explicitly safe to execute autonomously.",
        }],
        executeRuntime: true,
    }, new Date("2026-09-02T19:00:10.000Z"));

    const recovery = result.intentResults.find((item) => item.intent.type === "RECOVER_FAILED_WORK");
    assert.ok(recovery);
    assert.equal(recovery.policy?.decision, "AUTONOMOUS");
    assert.equal(recovery.decision?.status, "ELIGIBLE");
    assert.equal(recovery.submission?.status, "SUBMITTED");
    assert.equal(recovery.continuation?.status, "SCHEDULED");
    assert.deepEqual(result.runtime?.completed, [recovery.submission?.workflow?.steps[0]?.id ? `executive:${recovery.submission.workflow.id}:${recovery.submission.workflow.steps[0].id}` : ""]);
    assert.equal(executions, 1);

    const workflows = await workflowStore.list();
    const queues = await queueStore.list();
    const recoveryWorkflow = workflows.find((workflow) => workflow.id === recovery.submission?.workflow?.id);
    const recoveryQueue = queues.find((item) => item.workflowId === recovery.submission?.workflow?.id);

    assert.equal(recoveryWorkflow?.steps[0]?.status, "COMPLETED");
    assert.equal(recoveryWorkflow?.status, WorkflowStatus.COMPLETED);
    assert.equal(recoveryQueue?.status, "COMPLETED");
    assert.ok(result.feedback.feedback.some((item) => item.workflowId === recoveryWorkflow?.id && item.status === "COMPLETED"));
    assert.ok(result.finalObservation.observations.some((item) => item.type === "FAILED_WORK"));

    console.log("");
    console.log("V7.8-J AUTONOMOUS EXECUTIVE CYCLE DEMO");
    console.log(`Initial state  : ${result.initialState.failed} failed`);
    console.log(`Intent         : ${recovery.intent.type}`);
    console.log(`Policy         : ${recovery.policy?.decision}`);
    console.log(`Decision       : ${recovery.decision?.status}`);
    console.log(`Submission     : ${recovery.submission?.status}`);
    console.log(`Continuation   : ${recovery.continuation?.status}`);
    console.log(`Runtime        : ${result.runtime?.completed.length ?? 0} completed`);
    console.log(`Executions     : ${executions}`);
    console.log(`Feedback       : ${result.feedback.feedback.length} records`);
    console.log(`Final state    : ${result.finalState.failed} failed | ${result.finalState.completed} completed`);
    console.log("");
    console.log("✓ Executive observation generated recovery intent from durable V6 truth.");
    console.log("✓ Intent became an execution plan through capability resolution.");
    console.log("✓ Explicit autonomy policy made safe recovery executable without founder approval.");
    console.log("✓ Eligible work was durably submitted and continued into the V6 queue.");
    console.log("✓ V6 runtime executed the recovery agent exactly once and completed the workflow.");
    console.log("✓ Execution feedback returned durable runtime outcome to the executive layer.");
    console.log("✓ The final observation sees the recovered work as completed while preserving the original failure history.");
    console.log("✓ The full cycle creates no external provider or network request.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
