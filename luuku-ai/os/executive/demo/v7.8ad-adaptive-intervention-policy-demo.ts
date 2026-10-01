import assert from "node:assert/strict";
import { ExecutiveAdaptiveInterventionPolicy } from "../adaptive-intervention-policy.js";
import type { MemoryAwareStrategyDecision } from "../memory-aware-strategy.js";
import type { ObjectiveIntervention } from "../objective-intervention.js";

const intervention = (
    objectiveId: string,
    type: ObjectiveIntervention["type"],
    required: boolean,
): ObjectiveIntervention => ({
    objectiveId,
    type,
    interventionRequired: required,
    reason: `${type} for ${objectiveId}`,
    evidence: { objectiveId, type },
});

const strategy = (
    objectiveId: string,
    adaptation: MemoryAwareStrategyDecision["adaptation"],
    risk: MemoryAwareStrategyDecision["actionRisk"],
): MemoryAwareStrategyDecision => ({
    objectiveId,
    actionRisk: risk,
    adaptation,
    relevantPatterns: [],
    reason: `${adaptation} based on historical evidence`,
});

const policy = new ExecutiveAdaptiveInterventionPolicy();

const change = policy.evaluate({
    intervention: intervention("provider-integration", "RECOVER_REGRESSION", true),
    strategy: strategy("provider-integration", "CHANGE_APPROACH", "HIGH"),
});

const adjust = policy.evaluate({
    intervention: intervention("pipeline", "INVESTIGATE_STAGNATION", true),
    strategy: strategy("pipeline", "ADJUST_APPROACH", "MEDIUM"),
});

const recover = policy.evaluate({
    intervention: intervention("operations", "RECOVER_FAILED_WORK", true),
    strategy: strategy("operations", "CONTINUE", "LOW"),
});

const continueDecision = policy.evaluate({
    intervention: intervention("revenue", "NO_INTERVENTION", false),
    strategy: strategy("revenue", "CONTINUE", "LOW"),
});

assert.equal(change.mode, "CHANGE_APPROACH");
assert.equal(adjust.mode, "ADJUST_APPROACH");
assert.equal(recover.mode, "RECOVER_FAILED_WORK");
assert.equal(continueDecision.mode, "CONTINUE");

assert.throws(() => policy.evaluate({
    intervention: intervention("objective-a", "RECOVER_REGRESSION", true),
    strategy: strategy("objective-b", "CHANGE_APPROACH", "HIGH"),
}));

console.log("V7.8-AD ADAPTIVE INTERVENTION POLICY DEMO");
console.log(`Change approach   : ${change.mode}`);
console.log(`Adjust approach   : ${adjust.mode}`);
console.log(`Failed work       : ${recover.mode}`);
console.log(`No intervention   : ${continueDecision.mode}`);
console.log("");
console.log("✓ Repeated historical failure can escalate intervention into a change of approach.");
console.log("✓ Failure/stagnation evidence can produce a bounded approach adjustment.");
console.log("✓ Existing failed-work recovery remains an explicit intervention path.");
console.log("✓ Healthy/no-intervention objectives continue without unnecessary action.");
console.log("✓ Objective identity mismatches are rejected deterministically.");
console.log("✓ Adaptive policy remains planning-only with no execution side effects.");
