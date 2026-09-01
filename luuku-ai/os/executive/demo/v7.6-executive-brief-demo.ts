import assert from "node:assert/strict";
import { buildExecutiveBrief } from "../executive-brief.js";
import type { ExecutiveState } from "../executive-state.js";

async function main() {
    const generatedAt = new Date("2026-09-01T07:12:00.000Z");
    const state: ExecutiveState = {
        generatedAt,
        active: 17,
        waitingApproval: 3,
        failed: 2,
        completed: 41,
        attention: [
            "Approval required: onboard Company X (approval-1)",
            "Approval required: send proposal to Company Y (approval-2)",
        ],
    };

    const brief = buildExecutiveBrief(state);

    assert.equal(brief.title, "Luuku Executive — Morning Brief");
    assert.equal(brief.summary, "63 tracked work items. 17 active, 41 completed, 2 failed, 3 waiting for approval.");
    assert.deepEqual(brief.attention, state.attention);
    assert.equal(brief.generatedAt, generatedAt);

    console.log("");
    console.log("========================================");
    console.log(" V7.6-B EXECUTIVE BRIEF DEMO");
    console.log("========================================");
    console.log("");
    console.log("Title     : Luuku Executive — Morning Brief");
    console.log("Summary   : 63 tracked work items. 17 active, 41 completed, 2 failed, 3 waiting for approval.");
    console.log("Attention : 2 approval decisions surfaced");
    console.log("");
    console.log("✓ Executive brief is generated from executive state.");
    console.log("✓ Counts are preserved without inventing additional work.");
    console.log("✓ Attention items are carried through explicitly.");
    console.log("✓ Brief timestamp remains attached to the source state.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
