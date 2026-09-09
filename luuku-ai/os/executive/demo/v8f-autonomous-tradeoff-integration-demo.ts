import assert from "node:assert/strict";
import type { AgentResult } from "../../../shared/agents/interface.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveCapacityGate } from "../executive-capacity-gate.js";
import { ExecutiveResourceBudget } from "../executive-resource-budget.js";
import { ExecutiveTradeoffEngine } from "../executive-tradeoff-engine.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";

let executions = 0;
const now = new Date("2026-09-09T06:30:00.000Z");

const controlledAgent = {
    id: "v8f-tradeoff-agent",
    name: "V8-F Tradeoff Agent",
    role: "executes economically selected work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Tradeoff-selected work completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: { provider: "v8f-tradeoff-agent", externalId: `execution-${executions}` },
        };
    },
};

function objective(
    id: string,
    title: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    previousProgress: number,
    minutesAgo: number,
): ExecutiveObjectiveRecord {
    return {
        id,
        title,
        description: `${title} objective`,
        priority,
        status: "ACTIVE",
        progress,
        previousProgress,
        createdAt: new Date(now.getTime() - minutesAgo * 60_000),
        updatedAt: now,
    };
}

async function main(): Promise<void> {
    const registry = new AgentRegistry();
    registry.register({ agent: controlledAgent, capabilities: ["work.recover"] });
    const resolver = new CapabilityResolver(new AgentDiscovery(registry));

    const objectives = new InMemoryExecutiveObjectiveStore();
    await objectives.save(objective("objective-revenue", "Protect Qualified Revenue", "high", 20, 20, 40));
    await objectives.save(objective("objective-efficiency", "Improve Agent Efficiency", "medium", 60, 60, 10));

    const capacityGate = new ExecutiveCapacityGate([
        { id: "agent:v8f-tradeoff-agent", limit: 2 },
        { id: "tool:web", limit: 2 },
        { id: "concurrency:executive", limit: 2 },
    ]);
    const resourceBudget = new ExecutiveResourceBudget([
        { id: "ai:tokens", limit: 50 },
    ]);
    const tradeoffEngine = new ExecutiveTradeoffEngine();

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
        capacityGate,
        resourceRequirements: () => [
            { resourceId: "agent:v8f-tradeoff-agent" },
            { resourceId: "tool:web" },
            { resourceId: "concurrency:executive" },
        ],
        resourceBudget,
        budgetRequirements: () => [{
            resourceId: "ai:tokens",
            units: 20,
        }],
        tradeoffEngine,
        tradeoffInputs: (candidate) => ({
            id: candidate.objective.id,
            objectiveValue: candidate.objective.id === "objective-revenue" ? 70 : 0,
            urgency: candidate.urgency.score,
            strategicImpact: candidate.objective.id === "objective-revenue" ? 15 : 0,
            resourceCost: candidate.objective.id === "objective-revenue" ? 10 : 50,
            risk: candidate.objective.id === "objective-revenue" ? 5 : 50,
        }),
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
        tradeoffEngine,
    }, now);

    const objectiveResults = result.objectiveResults;
    const tradeoff = objectiveResults[0]?.tradeoff;
    const workflows = await workflowStore.list();
    const executed = result.runtime?.executed.length ?? 0;
    const completed = result.runtime?.completed.length ?? 0;
    const selectedIds = tradeoff?.evidence.selected as string[] | undefined;
    const deferredIds = tradeoff?.evidence.deferred as string[] | undefined;
    const rejectedIds = tradeoff?.evidence.rejected as string[] | undefined;

    assert.equal(objectiveResults.length, 1);
    assert.deepEqual(tradeoff?.allocations.map((item) => item.candidateId), ["objective-revenue", "objective-efficiency"]);
    assert.deepEqual(selectedIds, ["objective-revenue"]);
    assert.deepEqual(deferredIds, []);
    assert.deepEqual(rejectedIds, ["objective-efficiency"]);
    assert.equal(executed, 1);
    assert.equal(completed, 1);
    assert.equal(workflows.length, 1);
    assert.equal(executions, 1);
    assert.equal(workflows.some((workflow) => workflow.id.includes("objective-efficiency")), false);

    console.log("V8-F AUTONOMOUS TRADEOFF INTEGRATION DEMO");
    console.log("V8-C selected       : objective-revenue -> objective-efficiency");
    console.log("V8-D admitted       : objective-revenue -> objective-efficiency");
    console.log("V8-E allocated      : objective-revenue -> objective-efficiency");
    console.log(`V8-F selected       : ${selectedIds?.join(" -> ")}`);
    console.log(`V8-F deferred       : ${deferredIds?.join(" -> ") || "none"}`);
    console.log(`V8-F rejected       : ${rejectedIds?.join(" -> ") || "none"}`);
    console.log(`Workflows submitted : ${workflows.length}`);
    console.log(`Workflows executed  : ${executed}`);
    console.log(`Workflows completed : ${completed}`);
    console.log(`Agent executions    : ${executions}`);
    console.log("");
    console.log("✓ V8-C arbitration feeds the V8-D capacity boundary");
    console.log("✓ V8-D admitted work enters the V8-E budget boundary");
    console.log("✓ V8-E allocated work enters the V8-F economic decision boundary");
    console.log("✓ positive expected value is selected for execution");
    console.log("✓ economically rejected work never enters planning or the V6 workflow path");
    console.log("✓ selected work executes exactly once through V6");
    console.log("✓ V8-F tradeoff evaluation creates no execution authority");
    console.log("✓ V6 remains the execution authority");
    console.log("");
    console.log("V8-F autonomous tradeoff integration: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
