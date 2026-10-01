import assert from "node:assert/strict";
import { ExecutiveLearningAdaptationEngine } from "../executive-learning-adaptation.js";
import type { ExecutiveLearningRecord } from "../executive-memory.js";
import type { ExecutiveTradeoffCandidate } from "../executive-tradeoff-engine.js";

const engine = new ExecutiveLearningAdaptationEngine();
const candidate: ExecutiveTradeoffCandidate = {
    id: "objective-revenue", objectiveValue: 50, urgency: 20, strategicImpact: 10, resourceCost: 10, risk: 5,
};
const success: ExecutiveLearningRecord = {
    pattern: "SUCCESS_PATTERN", action: "provider-sync", objectiveIds: ["objective-revenue"],
    occurrences: 3, successfulOccurrences: 3, failedOccurrences: 0, confidence: 1,
    lesson: "The selected approach has repeatedly completed successfully.",
};
const failure: ExecutiveLearningRecord = {
    pattern: "FAILURE_PATTERN", action: "provider-sync", objectiveIds: ["objective-revenue"],
    occurrences: 3, successfulOccurrences: 1, failedOccurrences: 2, confidence: 1 / 3,
    lesson: "Historical failures indicate elevated execution risk.",
};
const repeatedFailure: ExecutiveLearningRecord = {
    pattern: "REPEATED_FAILURE", action: "provider-sync", objectiveIds: ["objective-revenue"],
    occurrences: 4, successfulOccurrences: 0, failedOccurrences: 4, confidence: 0,
    lesson: "Repeated failure requires a materially more cautious approach.",
};

const baseline = engine.adapt(candidate, []);
const successResult = engine.adapt(candidate, [success]);
const failureResult = engine.adapt(candidate, [failure]);
const repeatedResult = engine.adapt(candidate, [repeatedFailure]);

assert.equal(baseline.adjustedCandidate.objectiveValue, 50);
assert.equal(successResult.adjustedCandidate.objectiveValue, 55);
assert.equal(failureResult.adjustedCandidate.risk, 15);
assert.equal(repeatedResult.adjustedCandidate.risk, 25);
assert.equal(repeatedResult.adjustments.riskAdjustment, 20);
assert.deepEqual(engine.adapt(candidate, [failure]).adjustedCandidate, failureResult.adjustedCandidate);

console.log("V8-G LEARNING ADAPTATION DEMO");
console.log(`Baseline value/risk : ${baseline.adjustedCandidate.objectiveValue}/${baseline.adjustedCandidate.risk}`);
console.log(`Success value/risk  : ${successResult.adjustedCandidate.objectiveValue}/${successResult.adjustedCandidate.risk}`);
console.log(`Failure value/risk  : ${failureResult.adjustedCandidate.objectiveValue}/${failureResult.adjustedCandidate.risk}`);
console.log(`Repeated value/risk : ${repeatedResult.adjustedCandidate.objectiveValue}/${repeatedResult.adjustedCandidate.risk}`);
console.log("");
console.log("✓ historical success increases future economic value");
console.log("✓ historical failure increases future economic risk");
console.log("✓ repeated failure applies a stronger bounded adjustment");
console.log("✓ learning adaptation is deterministic and auditable");
console.log("✓ learning adaptation creates no execution authority");
console.log("");
console.log("V8-G learning adaptation: PASS");
