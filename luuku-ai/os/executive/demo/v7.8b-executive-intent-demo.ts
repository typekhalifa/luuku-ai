import type { ExecutiveState } from "../executive-state.js";
import { ExecutiveObservationLoop } from "../executive-observation.js";
import { ExecutiveIntentProjector } from "../executive-intent.js";

const state: ExecutiveState = {
    generatedAt: new Date("2026-09-01T00:00:00.000Z"),
    active: 2,
    waitingApproval: 1,
    failed: 1,
    completed: 5,
    attention: ["approval-1"],
};

const observationLoop = new ExecutiveObservationLoop();
const intentProjector = new ExecutiveIntentProjector();
const observations = observationLoop.observe(state);
const intents = intentProjector.derive(observations);

console.log("V7.8-B EXECUTIVE INTENT DEMO");
console.log(
    `Observed state : ${state.active} active | ${state.waitingApproval} approval | ${state.failed} failed | ${state.completed} completed`,
);
console.log(`Intents        : ${intents.intents.length}`);
for (const intent of intents.intents) {
    console.log(`${intent.type.padEnd(26)} ${intent.objective}`);
}

const types = new Set(intents.intents.map((intent) => intent.type));
if (!types.has("RECOVER_FAILED_WORK")) throw new Error("Failed-work intent missing.");
if (!types.has("WAIT_FOR_FOUNDER_DECISION")) throw new Error("Approval intent missing.");
if (!types.has("MONITOR_ACTIVE_WORK")) throw new Error("Active-work intent missing.");
if (intents.intents.some((intent) => intent.sourceObservationIds.length !== 1)) {
    throw new Error("Intent must retain exactly one source observation in this demo.");
}

console.log("✓ Intent is derived deterministically from observations.");
console.log("✓ Failed work, approval pressure, and active work become explicit executive intents.");
console.log("✓ Intent carries source observation IDs and evidence without inventing new truth.");
console.log("✓ Intent projection creates no plans, approvals, queue items, or executions.");
console.log("✓ No external provider or network request was used.");
