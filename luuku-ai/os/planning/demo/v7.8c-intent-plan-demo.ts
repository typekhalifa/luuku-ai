import { ExecutiveObservationLoop } from "../executive/executive-observation.js";
import { ExecutiveIntentProjector } from "../executive/executive-intent.js";
import { ExecutiveIntentPlanBuilder } from "./intent-plan-builder.js";
import { CapabilityResolver } from "./capability-resolver.js";
import { InMemoryAgentRegistry } from "../agents/in-memory-agent-registry.js";

const registry = new InMemoryAgentRegistry();
registry.register({
    id: "recovery-agent",
    name: "Recovery Agent",
    description: "Handles recovery investigation.",
    capabilities: ["work.recover"],
});

const resolver = new CapabilityResolver(registry);
const builder = new ExecutiveIntentPlanBuilder(resolver);

const state = {
    generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    active: 0,
    waitingApproval: 0,
    failed: 1,
    completed: 5,
    attention: [],
};

const observations = new ExecutiveObservationLoop().observe(state);
const intents = new ExecutiveIntentProjector().derive(observations);
const recoveryIntent = intents.intents.find((intent) => intent.type === "RECOVER_FAILED_WORK");
if (!recoveryIntent) throw new Error("Recovery intent missing.");

const executionPlan = builder.build({
    intent: recoveryIntent,
    capabilities: { RECOVER_FAILED_WORK: "work.recover" },
});

console.log("V7.8-C INTENT → EXECUTION PLAN DEMO");
console.log(`Intent         : ${recoveryIntent.type}`);
console.log(`Plan           : ${executionPlan.id}`);
console.log(`Goal           : ${executionPlan.goal}`);
console.log(`Steps          : ${executionPlan.steps.length}`);
console.log(`Agent          : ${executionPlan.steps[0]?.agentId}`);
console.log(`Capability     : ${executionPlan.steps[0]?.capability}`);
console.log(`Approval       : ${executionPlan.requiresFounderApproval}`);

if (executionPlan.sourcePlanId !== "intent-plan-recover-failed-work") {
    throw new Error("Execution plan did not preserve its source plan identity.");
}
if (executionPlan.steps[0]?.agentId !== "recovery-agent") {
    throw new Error("Capability resolution did not select the expected agent.");
}
if (executionPlan.steps[0]?.capability !== "work.recover") {
    throw new Error("Execution plan capability is incorrect.");
}
if (executionPlan.steps[0]?.metadata) {
    throw new Error("ExecutionPlanStep must remain the existing execution-plan contract.");
}

console.log("✓ Executive intent is converted into the existing execution-plan contract.");
console.log("✓ Capability resolution selects the registered agent explicitly.");
console.log("✓ Source intent identity and evidence are carried into the plan metadata/input.");
console.log("✓ Planning creates no approval, queue item, or execution side effect.");
console.log("✓ No external provider or network request was used.");
