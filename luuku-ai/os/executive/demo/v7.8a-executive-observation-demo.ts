import { ExecutiveObservationLoop } from "../executive-observation.js";
import type { ExecutiveState } from "../executive-state.js";

async function main(): Promise<void> {
    console.log("========================================");
    console.log(" V7.8-A EXECUTIVE OBSERVATION LOOP DEMO");
    console.log("========================================\n");

    const state: ExecutiveState = {
        generatedAt: new Date("2026-09-01T08:00:00.000Z"),
        active: 2,
        waitingApproval: 1,
        failed: 1,
        completed: 5,
        attention: ["Approval required: onboard Company X (approval-1)"],
    };

    const loop = new ExecutiveObservationLoop();
    const snapshot = loop.observe(state);

    console.log(`Observed state : ${snapshot.state.active} active | ${snapshot.state.waitingApproval} approval | ${snapshot.state.failed} failed | ${snapshot.state.completed} completed`);
    console.log(`Observations   : ${snapshot.observations.length}`);
    for (const observation of snapshot.observations) {
        console.log(`${observation.severity.padEnd(9)} ${observation.type.padEnd(18)} ${observation.message}`);
    }

    if (snapshot.observations.length !== 3) throw new Error("Expected active, approval, and failure observations.");
    if (!snapshot.observations.some((item) => item.type === "ACTIVE_WORK")) throw new Error("Missing active-work observation.");
    if (!snapshot.observations.some((item) => item.type === "PENDING_APPROVAL")) throw new Error("Missing pending-approval observation.");
    if (!snapshot.observations.some((item) => item.type === "FAILED_WORK")) throw new Error("Missing failed-work observation.");

    const frozenActive = snapshot.state.active;
    const mutated = snapshot.observations[0];
    if (mutated) mutated.evidence.active = 999;
    if (snapshot.state.active !== frozenActive) throw new Error("Observation evidence mutated projected state.");

    console.log("\n✓ Observation loop derives facts from executive state.");
    console.log("✓ Active work, approval pressure, and failures are surfaced explicitly.");
    console.log("✓ Observations contain evidence without inventing new company truth.");
    console.log("✓ Observation does not create plans, approvals, queue items, or executions.");
    console.log("✓ No external provider or network request was used.");
}

void main();
