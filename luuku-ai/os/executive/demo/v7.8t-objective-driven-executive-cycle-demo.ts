import assert from "node:assert/strict";
import type { Agent } from "../../agents/agent.js";
import type { ExecutiveState } from "../executive-state.js";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import { InMemoryExecutiveObjectiveStore } from "../objective-engine.js";
import { AgentDiscovery } from "../../agents/agent-discovery.js";
import { AgentRegistry } from "../../agents/agent-registry.js";
import { CapabilityResolver } from "../../planning/capability-resolver.js";
import { ObjectiveDrivenExecutiveCycle } from "../objective-driven-executive-cycle.js";

const agent: Agent = {
    id: "recovery-agent-t",
    name: "Recovery Agent T",
    description: "Handles failed operational work.",
    capabilities: ["recover-failed-work"],
    async execute() {
        executions += 1;
        throw new Error("Execution must not occur in the objective-driven planning demo.");
    },
};

let executions = 0;

const objective: ExecutiveObjectiveRecord = {
    id: "objective-recover-operations-t",
    title: "Recover Failed Operations",
    description: "Resolve failed operational work without duplicating execution.",
    priority: "high",
    status: "ACTIVE",
    progress: 10,
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z"),
};

const state: ExecutiveState = {
    active: 0,
    waitingApproval: 0,
    failed: 1,
    completed: 2,
    attention: ["1 work item has failed."],
    failedWorkIds: ["failed-work-t"],
};

const store = new InMemoryExecutiveObjectiveStore();
await store.save(objective);

const registry = new AgentRegistry();
registry.register(agent);

const discovery = new AgentDiscovery(registry);
const resolver = new CapabilityResolver(discovery);
const cycle = new ObjectiveDrivenExecutiveCycle(store, resolver);

const results = await cycle.run(state, {
    RECOVER_FAILED_WORK: "recover-failed-work",
});

assert.equal(results.length, 1);
const result = results[0];
assert.equal(result.objective.id, objective.id);
assert.equal(result.assessment.attentionRequired, true);
assert.equal(result.assessment.progress, 10);
assert.equal(result.intent.type, "RECOVER_FAILED_WORK");
assert.equal(result.intent.evidence.objectiveId, objective.id);
assert.ok(result.plan);
assert.equal(result.plan.goal, objective.title);
assert.equal(result.plan.steps.length, 1);
assert.equal(result.plan.steps[0].agentId, agent.id);
assert.equal(result.plan.steps[0].capability, "recover-failed-work");
assert.equal(executions, 0);

console.log("V7.8-T OBJECTIVE-DRIVEN EXECUTIVE CYCLE DEMO");
console.log(`Objectives assessed: ${results.length}`);
console.log(`Objective          : ${result.objective.title}`);
console.log(`Assessment         : ${result.assessment.progress}%`);
console.log(`Intent             : ${result.intent.type}`);
console.log(`Plan               : ${result.plan.id}`);
console.log(`Plan agent         : ${result.plan.steps[0].agentId}`);
console.log(`Agent executions   : ${executions}`);
console.log("");
console.log("✓ Active objectives are assessed from executive state.");
console.log("✓ Failed work becomes a RECOVER_FAILED_WORK executive intent.");
console.log("✓ The intent resolves into an executable recovery plan.");
console.log("✓ Planning remains side-effect free; no agent execution occurred.");
console.log("✓ V6 execution authority remains below the planning boundary.");
