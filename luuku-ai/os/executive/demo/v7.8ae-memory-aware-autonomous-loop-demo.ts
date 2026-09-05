import assert from "node:assert/strict";

import type { AgentResult } from "../../../shared/agents/interface.js";
import { registerAgent } from "../../../shared/agents/registry.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { InMemoryExecutiveMemoryStore } from "../executive-memory.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";

let executions = 0;
const interventionAgent = {
    id: "adaptive-intervention-agent-ae",
    name: "Adaptive Intervention Agent",
    role: "executes controlled objective interventions",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Adaptive intervention completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "controlled-v7.8ae-agent",
                details: { execution: executions },
            },
        };
    },
};
registerAgent(interventionAgent);

async function main(): Promise<void> {
    const now = new Date("2026-09-05T12:00:00.000Z");
    const agentRegistry = new AgentRegistry();
    agentRegistry.register({ agent: interventionAgent, capabilities: ["work.intervene"] });

    const capabilityResolver = new CapabilityResolver(new AgentDiscovery(agentRegistry));
    const objectiveStore = new InMemoryExecutiveObjectiveStore();
    const memoryStore = new InMemoryExecutiveMemoryStore();

    const objective: ExecutiveObjectiveRecord = {
        id: "objective-provider-ae",
        title: "Stabilize Provider Integration",
        description: "Correct a regressing provider integration without repeating the failed approach.",
        priority: "high",
        status: "ACTIVE",
        progress: 30,
        previousProgress: 40,
        createdAt: new Date("2026-09-05T08:00:00.000Z"),
        updatedAt: now,
    };
    await objectiveStore.save(objective);

    await memoryStore.save({
        id: "ae-failure-1",
        objectiveId: objective.id,
        eventType: "ACTION_FAILED",
        action: "RECOVER_REGRESSION",
        outcome: "Provider sync timed out.",
        success: false,
        lesson: "The previous provider recovery path timed out.",
        createdAt: new Date("2026-09-05T10:00:00.000Z"),
    });
    await memoryStore.save({
        id: "ae-failure-2",
        objectiveId: objective.id,
        eventType: "ACTION_FAILED",
        action: "RECOVER_REGRESSION",
        outcome: "Provider sync timed out again.",
        success: false,
        lesson: "Do not repeat the previous provider recovery path.",
        createdAt: new Date("2026-09-05T11:00:00.000Z"),
    });

    const workflowStore = new InMemoryWorkflowStore();
    const queueStore = new InMemoryQueueStore();
    const cycle = new AutonomousExecutiveCycle(
        workflowStore,
        queueStore,
        capabilityResolver,
        {
            capabilities: { INTERVENE_OBJECTIVE: "work.intervene" },
            policyRules: [{
                capability: "work.intervene",
                decision: "AUTONOMOUS",
                reason: "Controlled objective intervention is explicitly safe for this demo.",
            }],
            objectiveStore,
            memoryStore,
            executeRuntime: true,
            workflowExecutor: {
                async execute() {
                    return interventionAgent.execute();
                },
            },
        },
    );

    const result = await cycle.run({
        capabilities: { INTERVENE_OBJECTIVE: "work.intervene" },
        policyRules: [{
            capability: "work.intervene",
            decision: "AUTONOMOUS",
            reason: "Controlled objective intervention is explicitly safe for this demo.",
        }],
        objectiveStore,
        memoryStore,
        executeRuntime: true,
    }, now);

    assert.equal(result.objectiveResults.length, 1);
    const objectiveResult = result.objectiveResults[0];
    assert.ok(objectiveResult);
    assert.equal(objectiveResult.progressTrend.trend, "REGRESSING");
    assert.equal(objectiveResult.strategy.adaptation, "CHANGE_APPROACH");
    assert.equal(objectiveResult.adaptiveIntervention.mode, "CHANGE_APPROACH");
    assert.equal(objectiveResult.intent.type, "INTERVENE_OBJECTIVE");
    assert.ok(objectiveResult.plan);

    const execution = result.intentResults.find((item) => item.intent.id === objectiveResult.intent.id);
    assert.ok(execution);
    assert.equal(execution.policy?.decision, "AUTONOMOUS");
    assert.equal(execution.decision?.status, "ELIGIBLE");
    assert.equal(execution.submission?.status, "SUBMITTED");
    assert.equal(execution.continuation?.status, "SCHEDULED");
    assert.equal(result.runtime?.completed.length, 1);
    assert.equal(executions, 1);

    const workflows = await workflowStore.list();
    const queues = await queueStore.list();
    const submittedWorkflow = execution.submission?.workflow;
    const completedWorkflow = workflows.find((workflow) => workflow.id === submittedWorkflow?.id);
    const completedQueue = queues.find((item) => item.workflowId === submittedWorkflow?.id);
    assert.equal(completedWorkflow?.status, WorkflowStatus.COMPLETED);
    assert.equal(completedQueue?.status, "COMPLETED");

    const memory = await memoryStore.list();
    assert.equal(memory.length, 3);
    assert.ok(memory.some((record) => record.workflowId === submittedWorkflow?.id && record.success));

    console.log("V7.8-AE MEMORY-AWARE AUTONOMOUS LOOP DEMO");
    console.log(`Objective trend    : ${objectiveResult.progressTrend.trend}`);
    console.log(`Learned pattern    : ${objectiveResult.strategy.adaptation}`);
    console.log(`Adaptive mode      : ${objectiveResult.adaptiveIntervention.mode}`);
    console.log(`Intent             : ${objectiveResult.intent.type}`);
    console.log(`Execution          : ${result.runtime?.completed.length ?? 0} completed`);
    console.log(`Agent executions   : ${executions}`);
    console.log(`Memory records     : ${memory.length}`);
    console.log(`Workflow state     : ${completedWorkflow?.status}`);
    console.log(`Queue state        : ${completedQueue?.status}`);
    console.log("");
    console.log("✓ Historical repeated failure changed the current intervention strategy.");
    console.log("✓ Adaptive policy converted memory evidence into CHANGE_APPROACH.");
    console.log("✓ The adapted objective intent entered the existing capability-based plan path.");
    console.log("✓ Approval policy and V6 execution authority remained in the existing execution path.");
    console.log("✓ The controlled intervention executed exactly once and reached durable completion.");
    console.log("✓ The successful outcome was written back into executive memory for future cycles.");
    console.log("✓ The autonomous loop closes the decision → execution → memory feedback path.");
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
