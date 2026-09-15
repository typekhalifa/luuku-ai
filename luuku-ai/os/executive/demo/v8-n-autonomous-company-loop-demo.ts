import { AutonomousCompanyLoopEngine } from "../v8-n-autonomous-company-loop.js";

const engine = new AutonomousCompanyLoopEngine();
const observedAt = "2026-09-15T20:00:00.000Z";

const blockedCycle = engine.runCycle({
    observedAt,
    exceptionSignals: [
        { type: "OBJECTIVE_STALLED", objectiveIds: ["growth"], description: "Growth objective has stopped progressing.", detectedAt: observedAt },
        { type: "SAFETY_BOUNDARY", objectiveIds: ["growth"], description: "A proposed action crossed a safety boundary.", detectedAt: observedAt },
    ],
    hasRunnableWork: true,
    hasStrategicPlan: true,
    interventionRequired: true,
    executionApproved: true,
});

const permittedCycle = engine.runCycle({ observedAt, hasRunnableWork: true, hasStrategicPlan: true, interventionRequired: true, executionApproved: true });
const gate = engine.evaluateExecutionGate({
    observedAt,
    exceptionSignals: blockedCycle.exceptions.map((exception) => ({ type: exception.type, objectiveIds: exception.objectiveIds, description: exception.description, detectedAt: exception.detectedAt, evidence: exception.evidence })),
    executionApproved: true,
});
const expectedPrefix = ["OBSERVE", "MANAGE_EXCEPTION", "SELECT_WORK", "PRIORITIZE", "PLAN", "INTERVENE"];
const prefixMatches = expectedPrefix.every((action, index) => blockedCycle.actions[index] === action);
const safetyException = blockedCycle.exceptions.find((exception) => exception.type === "SAFETY_BOUNDARY");
const safetyHalt = safetyException?.recommendedResponse === "HALT_PENDING_REVIEW";
const blockedBySafety = !blockedCycle.executionPermitted && !blockedCycle.actions.includes("EXECUTE_THROUGH_V6");
const preExecutionGateBlocked = !gate.permitted && gate.reason?.includes("SAFETY_BOUNDARY");
const permittedThroughV6 = permittedCycle.executionPermitted && permittedCycle.actions.includes("EXECUTE_THROUGH_V6");
const orchestrationOnly = blockedCycle.executionBoundary === "ORCHESTRATION_ONLY";

console.log("V8-N — Autonomous Company Loop Validation");
console.log(`Blocked lifecycle            : ${blockedCycle.actions.join(" → ")}`);
console.log(`Permitted lifecycle          : ${permittedCycle.actions.join(" → ")}`);
console.log(`Exceptions managed           : ${blockedCycle.exceptions.length}`);
console.log(`Safety response              : ${safetyException?.recommendedResponse ?? "NONE"}`);
console.log(`Safety execution gate        : ${blockedBySafety ? "BLOCKED" : "FAILED"}`);
console.log(`Pre-execution gate           : ${preExecutionGateBlocked ? "BLOCKED" : "FAILED"}`);
console.log(`Clean execution path         : ${permittedThroughV6 ? "V6" : "BLOCKED"}`);
console.log(`Execution boundary           : ${blockedCycle.executionBoundary}`);

if (!prefixMatches) throw new Error("V8-N validation failed: lifecycle composition order is incorrect.");
if (!safetyHalt) throw new Error("V8-N validation failed: safety exception did not halt pending review.");
if (!blockedBySafety) throw new Error("V8-N validation failed: critical exception did not block execution.");
if (!preExecutionGateBlocked) throw new Error("V8-N validation failed: pre-execution gate did not block the critical exception.");
if (!permittedThroughV6) throw new Error("V8-N validation failed: clean execution did not remain explicitly bounded to V6.");
if (!orchestrationOnly) throw new Error("V8-N validation failed: orchestration boundary is not ORCHESTRATION_ONLY.");
if (!blockedCycle.actions.includes("LEARN") || !blockedCycle.actions.includes("REMEMBER") || !blockedCycle.actions.includes("EVOLVE_STRATEGY")) throw new Error("V8-N validation failed: learning, memory, and strategy evolution are missing.");

console.log("✓ Observation begins every autonomous cycle");
console.log("✓ Exceptions are managed before downstream execution decisions");
console.log("✓ Critical exceptions block the pre-execution transition to V6");
console.log("✓ Clean execution remains explicitly bounded to V6");
console.log("✓ Learning, institutional memory, and strategy evolution close the loop");
console.log("✓ V8-N remains orchestration-only and cannot become a second execution authority");
console.log("V8-N VALIDATION: PASS");
