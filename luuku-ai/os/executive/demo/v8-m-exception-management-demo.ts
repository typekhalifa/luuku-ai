import {
    ExecutiveExceptionManagementEngine,
    type ExecutiveExceptionSignal,
} from "../v8-m-exception-management.js";

const engine = new ExecutiveExceptionManagementEngine();
const detectedAt = "2026-09-15T18:00:00.000Z";

const signals: readonly ExecutiveExceptionSignal[] = [
    {
        type: "OBJECTIVE_STALLED",
        objectiveIds: ["market-expansion"],
        description: "Market expansion progress has stopped.",
        detectedAt,
    },
    {
        type: "REPEATED_FAILURE",
        objectiveIds: ["operational-scale"],
        description: "The same operational workflow has failed repeatedly.",
        detectedAt,
        repeatedFailureCount: 4,
    },
    {
        type: "ECONOMIC_ASSUMPTION_BROKEN",
        objectiveIds: ["market-expansion"],
        description: "Expected acquisition economics are no longer valid.",
        detectedAt,
    },
    {
        type: "SAFETY_BOUNDARY",
        objectiveIds: ["operational-scale"],
        description: "A proposed action crossed an executive safety boundary.",
        detectedAt,
    },
    {
        type: "APPROVAL_REQUIRED",
        objectiveIds: ["market-expansion"],
        description: "The next strategic action requires explicit executive approval.",
        detectedAt,
    },
];

const exceptions = engine.classifyMany(signals);

const stalled = exceptions.find((item) => item.type === "OBJECTIVE_STALLED");
const repeatedFailure = exceptions.find((item) => item.type === "REPEATED_FAILURE");
const economic = exceptions.find((item) => item.type === "ECONOMIC_ASSUMPTION_BROKEN");
const safety = exceptions.find((item) => item.type === "SAFETY_BOUNDARY");
const approval = exceptions.find((item) => item.type === "APPROVAL_REQUIRED");

if (!stalled || stalled.severity !== "ROUTINE" || stalled.recommendedResponse !== "ADAPT_INTERVENTION") {
    throw new Error("V8-M validation failed: stalled objective classification.");
}

if (!repeatedFailure || repeatedFailure.severity !== "SERIOUS" || repeatedFailure.recommendedResponse !== "ADAPT_INTERVENTION") {
    throw new Error("V8-M validation failed: repeated failure classification.");
}

if (!economic || economic.severity !== "SERIOUS" || economic.recommendedResponse !== "REPLAN_STRATEGY") {
    throw new Error("V8-M validation failed: economic assumption classification.");
}

if (!safety || safety.severity !== "CRITICAL" || safety.recommendedResponse !== "HALT_PENDING_REVIEW" || !safety.escalationRequired) {
    throw new Error("V8-M validation failed: safety boundary classification.");
}

if (!approval || approval.severity !== "CRITICAL" || approval.recommendedResponse !== "ESCALATE_EXECUTIVE" || !approval.escalationRequired) {
    throw new Error("V8-M validation failed: approval classification.");
}

if (exceptions.some((item) => item.executionBoundary !== "MANAGEMENT_ONLY")) {
    throw new Error("V8-M validation failed: execution boundary was not preserved.");
}

if (exceptions[0]?.severity !== "CRITICAL" || exceptions[1]?.severity !== "CRITICAL") {
    throw new Error("V8-M validation failed: critical exceptions were not prioritized.");
}

const deterministicA = engine.classify(signals[0]);
const deterministicB = engine.classify(signals[0]);
if (deterministicA.exceptionId !== deterministicB.exceptionId) {
    throw new Error("V8-M validation failed: exception identity is not deterministic.");
}

console.log("V8-M — Exception Management Validation");
console.log(`Exceptions classified        : ${exceptions.length}`);
console.log(`Critical exceptions          : ${exceptions.filter((item) => item.severity === "CRITICAL").length}`);
console.log(`Serious exceptions           : ${exceptions.filter((item) => item.severity === "SERIOUS").length}`);
console.log(`Routine exceptions           : ${exceptions.filter((item) => item.severity === "ROUTINE").length}`);
console.log(`Highest severity              : ${exceptions[0]?.severity}`);
console.log(`Safety response               : ${safety.recommendedResponse}`);
console.log(`Execution boundary            : ${safety.executionBoundary}`);
console.log("✓ Exceptions are classified deterministically");
console.log("✓ Safety and approval boundaries outrank routine adaptation");
console.log("✓ Strategic breaks route to re-planning rather than execution");
console.log("✓ Operational exceptions route to bounded intervention");
console.log("✓ V8-M manages exceptions only; it does not execute responses");
console.log("V8-M VALIDATION: PASS");
