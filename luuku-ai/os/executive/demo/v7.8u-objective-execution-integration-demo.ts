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
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ObjectiveDrivenExecutiveCycle } from "../objective-driven-executive-cycle.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";

let executions = 0;
const recoveryAgent = {
    id: "objective-recovery-agent-u",
    name: "Objective Recovery Agent",
    role: "recovers failed objective work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Objective-driven recovery completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v7.8u-agent",
                externalId: `execution-${executions}`,
            },
        };
    },
};
registerAgent(recoveryAgent);

async function main(): Promise<void> {
    const agentRegistry = new AgentRegistry();
    agentRegistry.register({ agent: recoveryAgent, capabilities: ["work.recover"] });

    const capabilityResolver = new CapabilityResolver(new AgentDiscovery(agentRegistry));
    const objectiveStore = new InMemoryExecutiveObjectiveStore();
    const objective: ExecutiveObjectiveRecord = {
        id: "objective-recover-operations-u",
        title: "Recover Failed Operations",
        description: "Recover failed operational work without founder intervention when explicitly safe.",
        priority: "high",
        status: "ACTIVE",
        progress: 10,
        createdAt: new Date("2026-09-05T04:00:00.000Z"),
        updatedAt: new Date("2026-09-05T04:00:00.000Z"),
    };
    await objectiveStore.save(objective);

    const failedWorkflow: Workflow = {
        id: "failed-work-objective-u",
        goal: "Recover the failed operation.",
        status: WorkflowStatus.FAILED,
        steps: [{
            id: "failed-step",
            title: "Recover failed operation",
            description: "Controlled failed work for the objective integration test.",
            agentId: "objective-recovery-agent-u",
            capability: "work.recover",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "FAILED",
            input: { source: "v7.8u-demo" },
        }],
        requiresFounderApproval: false,
        metadata: { source: "v7.8u-objective-execution-integration-demo" },
        createdAt: new Date("2026-09-05T04:00:00.000Z"),
        updatedAt: new Date("2026-09-05T04:00:00.000Z"),
    };

    const objectiveCycle = new ObjectiveDrivenExecutiveCycle(objectiveStore, capabilityResolver);
    const objectiveResult = await objectiveCycle.run({
        failed: 1,
        waitingApproval: 0,
        active: 0,
        completed: 0,
        attention: ["Failed objective work requires recovery."],
        generatedAt: new Date("2026-09-05T04:00:10.000Z"),
    }, { RECOVER_FAILED_WORK: "work.recover" });

    assert.equal(objectiveResult.length, 1);
    assert.equal(objectiveResult[0]?.intent.type, "RECOVER_FAILED_WORK");
    assert.ok(objectiveResult[0]?.plan);
    assert.equal(executions, 0);

    const workflowStore = new InMemoryWorkflowStore();
    const queueStore = new InMemoryQueueStore();
    await workflowStore.create(failedWorkflow);

    const cycle = new AutonomousExecutiveCycle(
        workflowStore,
        queueStore,
        capabilityResolver,
        {
            capabilities: { RECOVER_FAILED_WORK: "work.recover" },
            policyRules: [{
                capability: "work.recover",
                decision: "AUTONOMOUS",
                reason: "Objective recovery is explicitly safe to execute autonomously.",
            }],
            executeRuntime: true,
            workflowExecutor: {
                async execute() {
                    return recoveryAgent.execute();
                },
            },
        },
    );

    const result = await cycle.run({
        capabilities: { RECOVER_FAILED_WORK: "work.recover" },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS",
            reason: "Objective recovery is explicitly safe to execute autonomously.",
        }],
        executeRuntime: true,
    }, new Date("2026-09-05T04:00:20.000Z"));

    const recovery = result.intentResults.find((item) => item.intent.type === "RECOVER_FAILED_WORK");
    assert.ok(recovery);
    assert.equal(recovery.policy?.decision, "AUTONOMOUS");
    assert.equal(recovery.decision?.status, "ELIGIBLE");
    assert.equal(recovery.submission?.status, "SUBMITTED");
    assert.equal(recovery.continuation?.status, "SCHEDULED");
    assert.equal(result.runtime?.completed.length, 1);
    assert.equal(executions, 1);

    const workflows = await workflowStore.list();
    const queues = await queueStore.list();
    const submitted = recovery.submission?.workflow;
    const completedWorkflow = workflows.find((workflow) => workflow.id === submitted?.id);
    const completedQueue = queues.find((item) => item.workflowId === submitted?.id);

    assert.equal(completedWorkflow?.status, WorkflowStatus.COMPLETED);
    assert.equal(completedWorkflow?.steps[0]?.status, "COMPLETED");
    assert.equal(completedQueue?.status, "COMPLETED");
    assert.equal(queues.length, 1);

    console.log("");
    console.log("V7.8-U OBJECTIVE → EXECUTION INTEGRATION DEMO");
    console.log(`Objective         : ${objective.title}`);
    console.log(`Assessment        : ${objective.progress}%`);
    console.log(`Intent            : ${objectiveResult[0]?.intent.type}`);
    console.log(`Plan              : ${objectiveResult[0]?.plan?.id}`);
    console.log(`Policy            : ${recovery.policy?.decision}`);
    console.log(`Decision          : ${recovery.decision?.status}`);
    console.log(`Submission        : ${recovery.submission?.status}`);
    console.log(`Continuation      : ${recovery.continuation?.status}`);
    console.log(`Runtime           : ${result.runtime?.completed.length ?? 0} completed`);
    console.log(`Agent executions  : ${executions}`);
    console.log(`Workflow state    : ${completedWorkflow?.status}`);
    console.log(`Queue state       : ${completedQueue?.status}`);
    console.log("");
    console.log("✓ Active objective assessment produced a recovery intent.");
    console.log("✓ Objective intent resolved through capability-based planning.");
    console.log("✓ Autonomous policy made the plan execution-eligible without approval.");
    console.log("✓ Eligible work entered the existing durable V6 workflow and canonical queue.");
    console.log("✓ V6 runtime executed the objective-driven agent exactly once.");
    console.log("✓ Durable workflow and queue truth both reached COMPLETED.");
    console.log("✓ No parallel executive execution path was created.");
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
