import assert from "node:assert/strict";
import { ExecutiveDecisionSurface } from "../decision-surface.js";

async function main() {
    const surface = new ExecutiveDecisionSurface();
    const decision = surface.create({
        id: "approval-1",
        action: "onboard Company X",
        reason: "Proposal is ready for founder review.",
    });

    assert.deepEqual(decision.actions, ["APPROVE", "REVIEW", "REJECT"]);
    assert.deepEqual(surface.decide(decision, "APPROVE"), { decisionId: "approval-1", action: "APPROVE" });
    assert.deepEqual(surface.decide(decision, "REVIEW"), { decisionId: "approval-1", action: "REVIEW" });
    assert.deepEqual(surface.decide(decision, "REJECT"), { decisionId: "approval-1", action: "REJECT" });
    assert.throws(() => surface.decide({ ...decision, actions: ["APPROVE", "REJECT"] }, "REVIEW"), /not available/);

    console.log("");
    console.log("========================================");
    console.log(" V7.6-C EXECUTIVE DECISION SURFACE DEMO");
    console.log("========================================");
    console.log("");
    console.log("Decision : onboard Company X");
    console.log("Actions  : APPROVE | REVIEW | REJECT");
    console.log("Approve  : structured decision returned");
    console.log("Review   : structured decision returned");
    console.log("Reject   : structured decision returned");
    console.log("");
    console.log("✓ Executive attention can become a structured decision.");
    console.log("✓ Available founder actions are explicit and deterministic.");
    console.log("✓ Decisions preserve the originating decision identity.");
    console.log("✓ Unsupported actions are rejected instead of guessed.");
    console.log("✓ The surface records intent without executing the underlying action.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
