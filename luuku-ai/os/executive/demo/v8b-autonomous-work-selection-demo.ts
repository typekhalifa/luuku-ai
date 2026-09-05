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
    id: "v8b-recovery-agent",
    name: "V8-B Recovery Agent",
    role: "recovers selected operational work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Selected objective work completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "v8b-controlled-agent",
                externalId: `execution-${executions}`,
                details: { execution: executions },
            },
        };
    },
};
registerAgent(recoveryAgent);

const now = new Date("2026-09-05T20:00:00.000Z");

function objective(id: string, title: string, priority: ExecutiveObjectiveRecord["priority"]): ExecutiveObjectiveRecord {
    return {
        id,
        title,
        description: `${title} objective`,
        priority,
        status: "ACTIVE",
        progress: 10,
        createdAt: now,
        updatedAt: now,
    };
}

function workflow(id: string): Workflow {
    return {
        id,
        goal: `Recover ${id}.`,
        status: WorkflowStatus.FAILED,
        steps: [{
            id: "recover",
            title: "Recover selected work",
            description: "Controlled V8-B recovery step.",
            agentId: recoveryAgent.id,
            capability: "work.recover",
            dependsOn: [],
            priority: Priority.HIGH,
            requiresApproval: false,
            status: "FAILED",
            input: { source: "v8b-demo" },
        }],
        requiresFounderApproval: false,
        metadata: { source: "v8b-autonomous-work-selection-demo" },
        createdAt: now,
        updatedAt: now,
    };
}

async function main(): Promise<void> {
    const agentRegistry = new AgentRegistry();
    agentRegistry.register({ agent: recoveryAgent, capabilities: ["work.recover"] });
    const capabilityResolver = new CapabilityResolver(new AgentDiscovery(agentRegistry));

    const objectiveStore = new InMemoryExecutiveObjectiveStore();
    await objectiveStore.save(objective("objective-critical", "Recover Critical Operations", "high"));
    await objectiveStore.save(objective("objective-secondary", "Recover Secondary Operations", "medium"));

    const objectiveCycle = new ObjectiveDrivenExecutiveCycle(
        objectiveStore,
        capabilityResolver,
        undefined,
        { maxSelections: 2 },
    );
    const objectiveResults = await objectiveCycle.run(
        {
            active: 0,
            waitingApproval: 0,
            failed: 2,
            completed: 0,
            attention: ["Two active objectives require recovery."],
            generatedAt: now,
            failedWorkIds: ["failed-critical", "failed-secondary"],
        },
        { RECOVER_FAILED_WORK: "work.recover" },
        now,
    );

    assert.equal(objectiveResults.length, 2);
    assert.deepEqual(
        objectiveResults.map((result) => result.objective.id),
        ["objective-critical", "objective-secondary"],
    );
    assert.ok(objectiveResults.every((result) => result.plan));

    const workflowStore = new InMemoryWorkflowStore();
    const queueStore = new InMemoryQueueStore();
    await workflowStore.create(workflow("workflow-critical"));
    await workflowStore.create(workflow("workflow-secondary"));

    const cycle = new AutonomousExecutiveCycle(
        workflowStore,
        queueStore,
        capabilityResolver,
        {
            capabilities: { RECOVER_FAILED_WORK: "work.recover" },
            policyRules: [{
                capability: "work.recover",
                decision: "AUTONOMOUS",
                reason: "Controlled recovery is explicitly safe for this demonstration.",
            }],
            executeRuntime: true,
            maxObjectiveSelections: 2,
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
            reason: "Controlled recovery is explicitly safe for this demonstration.",
        }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
    }, now);

    assert.equal(result.objectiveResults.length, 2);
    assert.equal(result.intentResults.filter((item) => item.decision?.status === "ELIGIBLE").length, 2);
    assert.equal(result.runtime?.completed.length, 2);
    assert.equal(executions, 2);

    console.log("V8-B AUTONOMOUS WORK SELECTION DEMO");
    console.log(`Active objectives : 2`);
    console.log(`Objectives chosen : ${result.objectiveResults.length}`);
    console.log(`Eligible actions  : ${result.intentResults.filter((item) => item.decision?.status === "ELIGIBLE").length}`);
    console.log(`Workflows executed : ${result.runtime?.executed.length ?? 0}`);
    console.log(`Workflows completed: ${result.runtime?.completed.length ?? 0}`);
    console.log(`Agent executions  : ${executions}`);
    console.log("");
    console.log("✓ the executive evaluates more than one active objective in a bounded cycle");
    console.log("✓ objective priority determines deterministic selection order");
    console.log("✓ selected objectives become independent executable plans");
    console.log("✓ multiple selected workflows can reach V6 runtime in one executive cycle");
    console.log("✓ each selected workflow is executed exactly once by the controlled runtime path");
    console.log("✓ V6 remains the execution authority for selected work");
    console.log("");
    console.log("V8-B work selection: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
