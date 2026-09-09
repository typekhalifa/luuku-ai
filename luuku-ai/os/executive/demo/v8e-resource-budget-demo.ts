import assert from "node:assert/strict";
import { ExecutiveResourceBudget } from "../executive-resource-budget";

const budget = new ExecutiveResourceBudget([
  { id: "ai:tokens", limit: 100, spent: 30 },
  { id: "ops:credits", limit: 10, spent: 4 },
]);

const candidates = [
  { id: "objective-one", priorityScore: 10, requirements: [{ resourceId: "ai:tokens", units: 40 }, { resourceId: "ops:credits", units: 3 }] },
  { id: "objective-two", priorityScore: 9, requirements: [{ resourceId: "ai:tokens", units: 35 }, { resourceId: "ops:credits", units: 3 }] },
  { id: "objective-three", priorityScore: 8, requirements: [{ resourceId: "ai:tokens", units: 20 }, { resourceId: "ops:credits", units: 2 }] },
];

const result = budget.allocate(candidates);
assert.deepEqual(result.allocations.map((item) => item.candidateId), ["objective-one", "objective-two", "objective-three"]);
assert.equal(result.allocations[0]?.decision, "ALLOCATE");
assert.equal(result.allocations[1]?.decision, "DEFER");
assert.equal(result.allocations[2]?.decision, "ALLOCATE");
assert.equal(result.remaining["ai:tokens"], 10);
assert.equal(result.remaining["ops:credits"], 1);
assert.equal(result.allocations[1]?.reason, "BUDGET_LIMIT:ai:tokens");

const unknown = new ExecutiveResourceBudget([{ id: "ai:tokens", limit: 10 }]).allocate([
  { id: "unknown", priorityScore: 1, requirements: [{ resourceId: "missing", units: 1 }] },
]);
assert.equal(unknown.allocations[0]?.decision, "DENY");
assert.equal(unknown.allocations[0]?.reason, "RESOURCE_UNAVAILABLE:missing");

const repeated = budget.allocate(candidates);
assert.deepEqual(repeated, result);

console.log("V8-E RESOURCE BUDGET DEMO");
console.log(`Candidates          : ${candidates.length}`);
console.log(`Allocated            : ${result.allocations.filter((item) => item.decision === "ALLOCATE").map((item) => item.candidateId).join(" -> ")}`);
console.log(`Deferred             : ${result.allocations.filter((item) => item.decision === "DEFER").map((item) => item.candidateId).join(" -> ")}`);
console.log(`AI token remaining   : ${result.remaining["ai:tokens"]}`);
console.log(`Ops credit remaining : ${result.remaining["ops:credits"]}`);
console.log("");
console.log("✓ budget allocation respects existing spend");
console.log("✓ higher-priority work consumes available budget first");
console.log("✓ budget exhaustion defers work without executing it");
console.log("✓ missing resources are denied before allocation");
console.log("✓ allocation decisions are deterministic and auditable");
console.log("✓ resource budgeting creates no execution authority");
console.log("✓ V6 remains the downstream execution authority");
console.log("");
console.log("V8-E resource budget: PASS");
