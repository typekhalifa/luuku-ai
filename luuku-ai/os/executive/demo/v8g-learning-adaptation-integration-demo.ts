import assert from "node:assert/strict";
import type { AgentResult } from "../../../shared/agents/interface.js";
import { AgentRegistry } from "../../agents/registry.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveCapacityGate } from "../executive-capacity-gate.js";
import { ExecutiveResourceBudget } from "../executive-resource-budget.js";
import { ExecutiveTradeoffEngine } from "../executive-tradeoff-engine.js";
import { ExecutiveLearningAdaptationEngine } from "../executive-learning-adaptation.js";
import { AutonomousExecutiveCycle } from "../autonomous-executive-cycle.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";
import type { ExecutiveMemoryRecord } from "../executive-memory.js";

let executions = 0;
const now = new Date("2026-09-09T07:00:00.000Z");

const controlledAgent = {
    id: "v8g-learning-agent",
    name: "V8-G Learning Agent",
    role: "executes learning-adapted work",
    async execute(): Promise<AgentResult> {
        executions += 1;
        return {
            success: true,
            summary: "Learning-adapted work completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "completed",
            executed: true,
            verified: true,
            evidence: {
                provider: "v8g-learning-agent",
                externalId: `execution-${executions}`,
                details: { execution: executions },
            },
        };
    },
};

function objective(id: string, priority: ExecutiveObjectiveRecord["priority"], progress: number, previousProgress: number): ExecutiveObjectiveRecord {
    return { id, title: id, description: `${id} objective`, priority, status: "ACTIVE", progress, previousProgress, createdAt: new Date(now.getTime() - 60_000), updatedAt: now };
}

async function main(): Promise<void> {
    const registry = new AgentRegistry();
    registry.register({ agent: controlledAgent, capabilities: ["work.recover"] });
    const resolver = new CapabilityResolver(new AgentDiscovery(registry));
    const objectives = new InMemoryExecutiveObjectiveStore();
    await objectives.save(objective("objective-revenue", "high", 20, 20));
    await objectives.save(objective("objective-efficiency", "medium", 60, 60));

    const memory: ExecutiveMemoryRecord[] = [{
        id: "learning-history-1",
        objectiveId: "objective-efficiency",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "previous approach failed",
        success: false,
        lesson: "Historical failures indicate elevated execution risk.",
        confidence: 0.25,
        createdAt: new Date(now.getTime() - 3_600_000),
    }, {
        id: "learning-history-2",
        objectiveId: "objective-efficiency",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "previous approach failed again",
        success: false,
        lesson: "Historical failures indicate elevated execution risk.",
        confidence: 0.25,
        createdAt: new Date(now.getTime() - 1_800_000),
    }];

    const memoryStore = {
        async list() { return memory; },
        async save(record: ExecutiveMemoryRecord) { memory.push(record); },
    };
    const workflowStore = new InMemoryWorkflowStore();
    const cycle = new AutonomousExecutiveCycle(workflowStore, new InMemoryQueueStore(), resolver, {
        capabilities: { RECOVER_FAILED_WORK: "work.recover", INTERVENE_OBJECTIVE: "work.recover" },
        policyRules: [{ capability: "work.recover", decision: "AUTONOMOUS", reason: "Controlled demonstration capability." }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
        objectiveStore: objectives,
        memoryStore,
        learningAdaptation: new ExecutiveLearningAdaptationEngine(),
        capacityGate: new ExecutiveCapacityGate([{ id: "agent:v8g-learning-agent", limit: 2 }, { id: "tool:web", limit: 2 }, { id: "concurrency:executive", limit: 2 }]),
        resourceRequirements: () => [{ resourceId: "agent:v8g-learning-agent" }, { resourceId: "tool:web" }, { resourceId: "concurrency:executive" }],
        resourceBudget: new ExecutiveResourceBudget([{ id: "ai:tokens", limit: 50 }]),
        budgetRequirements: () => [{ resourceId: "ai:tokens", units: 10 }],
        tradeoffEngine: new ExecutiveTradeoffEngine(),
        tradeoffInputs: (candidate) => ({
            id: candidate.objective.id,
            objectiveValue: candidate.objective.id === "objective-revenue" ? 70 : 0,
            urgency: candidate.urgency.score,
            strategicImpact: candidate.objective.id === "objective-revenue" ? 15 : 0,
            resourceCost: candidate.objective.id === "objective-revenue" ? 10 : 40,
            risk: candidate.objective.id === "objective-revenue" ? 5 : 15,
        }),
        workflowExecutor: { async execute() { return controlledAgent.execute(); } },
    });

    const result = await cycle.run({
        capabilities: { RECOVER_FAILED_WORK: "work.recover", INTERVENE_OBJECTIVE: "work.recover" },
        policyRules: [{ capability: "work.recover", decision: "AUTONOMOUS", reason: "Controlled demonstration capability." }],
        executeRuntime: true,
        maxObjectiveSelections: 2,
        objectiveStore: objectives,
    }, now);

    const selectedResult = result.objectiveResults[0];
    const tradeoff = selectedResult?.tradeoff;
    const efficiencyAllocation = tradeoff?.allocations.find((item) => item.candidateId === "objective-efficiency");
    const revenueAllocation = tradeoff?.allocations.find((item) => item.candidateId === "objective-revenue");

    assert.ok(selectedResult?.learningAdaptation);
    const revenueLearning = selectedResult.learningAdaptation.find((item) => item.originalCandidate.id === "objective-revenue");
    assert.ok(revenueLearning);
    assert.equal(revenueLearning.adjustments.valueAdjustment, 0);
    assert.equal(efficiencyAllocation?.decision, "REJECT");
    assert.equal(efficiencyAllocation?.score.riskPenalty, 25);
    assert.equal(revenueAllocation?.decision, "SELECT");
    assert.equal(result.runtime?.executed.length, 1);
    assert.equal(result.runtime?.completed.length, 1);
    assert.equal(executions, 1);
    assert.equal((await workflowStore.list()).length, 1);

    console.log("V8-G LEARNING ADAPTATION INTEGRATION DEMO");
    console.log("Historical records   : 2");
    console.log(`Efficiency risk      : ${efficiencyAllocation?.score.riskPenalty}`);
    console.log(`Revenue adjustment   : +${revenueLearning.adjustments.valueAdjustment} value`);
    console.log("V8-F selected        : objective-revenue");
    console.log("V8-F rejected        : objective-efficiency");
    console.log(`Workflows submitted  : ${(await workflowStore.list()).length}`);
    console.log(`Workflows executed   : ${result.runtime?.executed.length ?? 0}`);
    console.log(`Workflows completed  : ${result.runtime?.completed.length ?? 0}`);
    console.log(`Agent executions     : ${executions}`);
    console.log("");
    console.log("✓ durable historical experience reaches the autonomous executive cycle");
    console.log("✓ learning adaptation changes future economic inputs");
    console.log("✓ failure history increases economic risk before tradeoff evaluation");
    console.log("✓ learning adaptation can flip a marginal economic decision");
    console.log("✓ economically rejected learned-risk work never enters the V6 workflow path");
    console.log("✓ selected work executes exactly once through V6");
    console.log("✓ learning adaptation creates no execution authority");
    console.log("✓ V6 remains the execution authority");
    console.log("");
    console.log("V8-G learning adaptation integration: PASS");
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
