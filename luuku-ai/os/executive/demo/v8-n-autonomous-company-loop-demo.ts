import { AutonomousCompanyLoopEngine } from "../v8-n-autonomous-company-loop.js";

const engine = new AutonomousCompanyLoopEngine();

const cycle = engine.runCycle({
    observedAt: "2026-09-15T20:00:00.000Z",
    exceptionSignals: [
        {
            type: "OBJECTIVE_STALLED",
            objectiveIds: ["growth"],
            description: "Growth objective has stopped progressing.",
            detectedAt: "2026-09-15T20:00:00.000Z",
        },
        {
            type: "SAFETY_BOUNDARY",
            objectiveIds: ["growth"],
            description: "A proposed action crossed a safety boundary.",
            detectedAt: "2026-09-15T20:00:00.000Z",
        },
    ],
    hasRunnableWork: true,
    hasStrategicPlan: true,
    interventionRequired: true,
    executionApproved: true,
});

const expectedPrefix = ["OBSERVE", "MANAGE_EXCEPTION", "SELECT_WORK", "PRIORITIZE", "PLAN", "INTERVENE", "EXECUTE_THROUGH_V6"];
const prefixMatches = expectedPrefix.every((action, index) => cycle.actions[index] === action);
const safetyException = cycle.exceptions.find((exception) => exception.type === "SAFETY_BOUNDARY");
const executionIsV6Bound = cycle.actions.includes("EXECUTE_THROUGH_V6");
const orchestrationOnly = cycle.executionBoundary === "ORCHESTRATION_ONLY";
const safetyHalt = safetyException?.recommendedResponse === "HALT_PENDING_REVIEW";

console.log("V8-N — Autonomous Company Loop Validation");
console.log(`Lifecycle actions            : ${cycle.actions.join(" → ")}`);
console.log(`Exceptions managed           : ${cycle.exceptions.length}`);
console.log(`Safety response              : ${safetyException?.recommendedResponse ?? "NONE"}`);
console.log(`Execution path               : ${executionIsV6Bound ? "V6" : "NONE"}`);
console.log(`Execution boundary           : ${cycle.executionBoundary}`);

if (!prefixMatches) {
    throw new Error("V8-N validation failed: lifecycle composition order is incorrect.");
}

if (!safetyHalt) {
    throw new Error("V8-N validation failed: safety exception did not halt pending review.");
}

if (!executionIsV6Bound) {
    throw new Error("V8-N validation failed: execution is not explicitly bounded to V6.");
}

if (!orchestrationOnly) {
    throw new Error("V8-N validation failed: orchestration boundary is not ORCHESTRATION_ONLY.");
}

if (!cycle.actions.includes("LEARN") || !cycle.actions.includes("REMEMBER") || !cycle.actions.includes("EVOLVE_STRATEGY")) {
    throw new Error("V8-N validation failed: learning, memory, and strategy evolution are missing.");
}

console.log("✓ Observation begins every autonomous cycle");
console.log("✓ Exceptions are managed before downstream execution decisions");
console.log("✓ Work selection, prioritization, planning, and intervention compose in order");
console.log("✓ Execution remains explicitly bounded to V6");
console.log("✓ Learning, institutional memory, and strategy evolution close the loop");
console.log("✓ V8-N orchestrates the company loop; it does not become a second execution authority");
console.log("V8-N VALIDATION: PASS");
