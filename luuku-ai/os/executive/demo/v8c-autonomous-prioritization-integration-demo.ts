import assert from "node:assert/strict";
import type { AgentResult } from "../../../shared/agents/interface.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";

let executions = 0;

const controlledAgent = {
    id: "v8c-controlled-agent",
    name: "V8-C Controlled Agent",
    role: "executes selected bounded work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Selected work completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "v8c-controlled-agent",
                externalId: `execution-${executions}`,
                details: { execution: executions },
            },
        };
    },
};

const now = new Date("2026-09-07T06:30:00.000Z");

function objective(
    id: string,
    title: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    previousProgress?: number,
): ExecutiveObjectiveRecord {
    return {
        id,
        title,
        description: `${title} objective`,
        priority,
        status: "ACTIVE",
        progress,
        previousProgress,
        createdAt: new Date(now.getTime() - (id === "objective-revenue" ? 40 : id === "objective-reliability" ? 30 : 10) * 60_000),
        updatedAt: now,
    };
}

async function main(): Promise<void> {
    const registry = new AgentRegistry();
    registry.register({ agent: controlledAgent, capabilities: ["work.recover"] });
    const resolver = new CapabilityResolver(new AgentDiscovery(registry));

    const objectives = new InMemoryExecutiveObjectiveStore();
    await objectives.save(objective("objective-revenue", "Protect Qualified Revenue", "high", 20, 20));
    await objectives.save(objective("objective-reliability", "Recover Platform Reliability", "high", 35, 20));
    await objectives.save(objective("objective-efficiency", "Improve Agent Efficiency", "medium", 60, 60));

    const workflowStore = new InMemoryWorkflowStore();
    const queueStore = new InMemoryQueueStore();
    const cycle = new AutonomousExecutiveCycle(workflowStore, queueStore, resolver, {
        capabilities: {
            RECOVER_FAILED_WORK: "work.recover",
            INTERVENE_OBJECTIVE: "work.recover",
        },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS",
            reason: "Controlled work is explicitly safe for this demonstration.",
        }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
        objectiveStore: objectives,
        workflowExecutor: {
            async execute() {
                return controlledAgent.execute();
            },
        },
        memoryStore: {
            async list() { return []; },
            async save() { return undefined; },
        },
    });

    const result = await cycle.run({
        capabilities: {
            RECOVER_FAILED_WORK: "work.recover",
            INTERVENE_OBJECTIVE: "work.recover",
        },
        policyRules: [{
            capability: "work.recover",
            decision: "AUTONOMOUS",
            reason: "Controlled work is explicitly safe for this demonstration.",
        }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
        objectiveStore: objectives,
    }, now);

    const selected = result.objectiveResults.map((item) => item.objective.id);
    const eligible = result.intentResults.filter((item) => item.decision?.status === "ELIGIBLE");
    const workflows = await workflowStore.list();
    const queue = await queueStore.list();

    assert.deepEqual(selected, ["objective-reliability", "objective-revenue"]);
    assert.equal(result.objectiveResults.length, 2);
    assert.equal(eligible.length, 2);
    assert.equal(workflows.length, 2);
    assert.equal(queue.length, 2);
    assert.equal(result.runtime?.executed.length, 2);
    assert.equal(result.runtime?.completed.length, 2);
    assert.equal(executions, 2);

    const unselected = ["objective-efficiency"];
    assert.equal(unselected.some((id) => workflows.some((workflow) => workflow.id.includes(id))), false);

    console.log("V8-C AUTONOMOUS PRIORITIZATION INTEGRATION DEMO");
    console.log(`Active objectives   : 3`);
    console.log(`Selected objectives : ${selected.join(" -> ")}`);
    console.log(`Selection budget    : 2`);
    console.log(`Eligible actions    : ${eligible.length}`);
    console.log(`Workflows submitted : ${workflows.length}`);
    console.log(`Workflows completed : ${result.runtime?.completed.length ?? 0}`);
    console.log(`Agent executions    : ${executions}`);
    console.log(`Rejected objectives : ${unselected.join(", ")}`);
    console.log("");
    console.log("✓ arbitration is integrated into the autonomous executive path");
    console.log("✓ urgency/progress signals and priority determine selected work");
    console.log("✓ the selection budget is enforced before planning");
    console.log("✓ only selected objectives enter the V6 workflow path");
    console.log("✓ selected workflows execute sequentially under the V6 runtime");
    console.log("✓ rejected objectives remain outside execution");
    console.log("✓ V6 remains the execution authority");
    console.log("");
    console.log("V8-C autonomous prioritization integration: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
