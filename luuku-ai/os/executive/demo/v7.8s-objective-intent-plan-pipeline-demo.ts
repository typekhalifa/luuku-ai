import assert from "node:assert/strict";
import type { Agent } from "../../../shared/agents/interface.js";
import type { ExecutiveState } from "../executive-state.js";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveObjectiveEngine, InMemoryExecutiveObjectiveStore } from "../objective-engine.js";
import { ExecutiveIntentPlanBuilder } from "../../planning/intent-plan-builder.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { AgentDiscovery } from "../../agents/discovery.js";
import { AgentRegistry } from "../../agents/registry.js";
import { ExecutiveObjectiveIntentPlanPipeline } from "../objective-intent-plan-pipeline.js";

const now = new Date();
let executions = 0;

const monitoringAgent: Agent = {
    id: "prospect-monitor-agent",
    name: "Prospect Monitor",
    role: "Sales intelligence",
    async execute() {
        executions += 1;
        throw new Error("Demo pipeline must not execute an agent.");
    },
};

const objective: ExecutiveObjectiveRecord = {
    id: "objective-close-prospects",
    title: "Close Qualified Prospects",
    description: "Prioritize converting high-quality prospects into meetings and customers.",
    priority: "high",
    status: "ACTIVE",
    progress: 25,
    createdAt: now,
    updatedAt: now,
};

const state: ExecutiveState = {
    generatedAt: now,
    active: 0,
    waitingApproval: 0,
    failed: 0,
    completed: 4,
    attention: [],
    failedWorkIds: [],
};

async function main() {
    const objectiveStore = new InMemoryExecutiveObjectiveStore();
    await objectiveStore.save(objective);

    const registry = new AgentRegistry();
    registry.register({
        agent: monitoringAgent,
        capabilities: ["monitor-prospects"],
    });

    const resolver = new CapabilityResolver(new AgentDiscovery(registry));
    const planBuilder = new ExecutiveIntentPlanBuilder(resolver);
    const pipeline = new ExecutiveObjectiveIntentPlanPipeline(
        new ExecutiveObjectiveEngine(objectiveStore),
        planBuilder,
    );

    const result = await pipeline.build(objective, state, {
        MONITOR_ACTIVE_WORK: "monitor-prospects",
    });

    assert.equal(result.objective.id, objective.id);
    assert.equal(result.assessment.progress, 25);
    assert.equal(result.intent.type, "MONITOR_ACTIVE_WORK");
    assert.equal(result.intent.evidence.objectiveId, objective.id);
    assert.ok(result.plan);
    assert.equal(result.plan?.goal, objective.title);
    assert.equal(result.plan?.steps.length, 1);
    assert.equal(result.plan?.steps[0]?.capability, "monitor-prospects");
    assert.equal(result.plan?.steps[0]?.agentId, monitoringAgent.id);
    assert.equal(executions, 0);

    console.log("V7.8-S OBJECTIVE → INTENT → PLAN PIPELINE DEMO");
    console.log(`Objective         : ${result.objective.title}`);
    console.log(`Assessment        : ${result.assessment.progress}%`);
    console.log(`Intent            : ${result.intent.type}`);
    console.log(`Plan              : ${result.plan?.id}`);
    console.log(`Plan agent        : ${result.plan?.steps[0]?.agentId}`);
    console.log(`Agent executions  : ${executions}`);
    console.log("");
    console.log("✓ Objective state is assessed before planning.");
    console.log("✓ Objective assessment becomes structured executive intent.");
    console.log("✓ Intent becomes a validated execution plan through capability resolution.");
    console.log("✓ Objective identity and progress survive into intent evidence and planning input.");
    console.log("✓ Planning resolves an agent capability without executing the agent.");
    console.log("✓ V6 execution authority remains below the planning boundary.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
