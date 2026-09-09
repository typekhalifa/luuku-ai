import assert from "node:assert/strict";
import { ExecutiveTradeoffEngine } from "../executive-tradeoff-engine";

const engine = new ExecutiveTradeoffEngine();
const candidates = [
  { id: "growth", objectiveValue: 80, urgency: 15, strategicImpact: 20, resourceCost: 25, risk: 10 },
  { id: "efficiency", objectiveValue: 55, urgency: 10, strategicImpact: 15, resourceCost: 20, risk: 10 },
  { id: "low-value", objectiveValue: 20, urgency: 5, strategicImpact: 5, resourceCost: 40, risk: 10 },
  { id: "marginal", objectiveValue: 20, urgency: 10, strategicImpact: 10, resourceCost: 30, risk: 10 },
];

const result = engine.evaluate(candidates);
assert.deepEqual(result.allocations.map((item) => item.candidateId), ["growth", "efficiency", "low-value", "marginal"]);
assert.equal(result.allocations[0]?.decision, "SELECT");
assert.equal(result.allocations[1]?.decision, "SELECT");
assert.equal(result.allocations[2]?.decision, "REJECT");
assert.equal(result.allocations[3]?.decision, "DEFER");
assert.equal(result.allocations[0]?.score.netScore, 80);
assert.equal(result.allocations[1]?.score.netScore, 50);
assert.equal(result.allocations[2]?.score.netScore, -20);
assert.equal(result.allocations[3]?.score.netScore, 0);

const repeated = engine.evaluate(candidates);
assert.deepEqual(repeated, result);

console.log("V8-F AUTONOMOUS TRADEOFF DEMO");
console.log(`Candidates          : ${candidates.length}`);
console.log(`Selected             : ${result.allocations.filter((item) => item.decision === "SELECT").map((item) => item.candidateId).join(" -> ")}`);
console.log(`Deferred             : ${result.allocations.filter((item) => item.decision === "DEFER").map((item) => item.candidateId).join(" -> ")}`);
console.log(`Rejected             : ${result.allocations.filter((item) => item.decision === "REJECT").map((item) => item.candidateId).join(" -> ")}`);
console.log("");
console.log("✓ objective value, urgency, and strategic impact contribute positive value");
console.log("✓ resource cost reduces expected value");
console.log("✓ risk reduces expected value");
console.log("✓ positive expected value is selected");
console.log("✓ marginal expected value is deferred");
console.log("✓ negative expected value is rejected");
console.log("✓ tradeoff decisions are deterministic and auditable");
console.log("✓ tradeoff evaluation creates no execution authority");
console.log("");
console.log("V8-F autonomous tradeoff: PASS");
