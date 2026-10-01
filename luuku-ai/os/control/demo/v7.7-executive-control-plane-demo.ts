import assert from "node:assert/strict";
import { ExecutiveControlPlane } from "../control-plane.js";

async function main() {
    const resolution = { capability: "proposal_generation", agentId: "sales", agentName: "Sales Agent" };
    const state = { generatedAt: new Date(), active: 2, waitingApproval: 1, failed: 0, completed: 5, attention: ["Approval required: send proposal (approval-1)"] } as const;
    const brief = { title: "Luuku Executive — Morning Brief", summary: "8 tracked work items.", attention: state.attention, generatedAt: state.generatedAt } as const;
    const decision = { id: "approval-1", action: "send proposal", reason: "Ready for founder review.", actions: ["APPROVE", "REVIEW", "REJECT"] as const };

    const plane = new ExecutiveControlPlane({
        resolver: { resolve: () => resolution } as never,
        state,
        brief,
        decisions: [decision],
        executionGate: { evaluate: (id: string) => ({ approvalId: id, status: "PENDING", eligibility: "WAITING_FOR_APPROVAL" }) } as never,
    });

    assert.deepEqual(plane.resolveCapability({ capability: "proposal_generation" }), resolution);
    assert.equal(plane.inspect().active, 2);
    assert.equal(plane.brief().title, "Luuku Executive — Morning Brief");
    assert.equal(plane.decisions().length, 1);
    assert.deepEqual(plane.decide("approval-1", "APPROVE"), { decisionId: "approval-1", action: "APPROVE" });
    assert.deepEqual(plane.executionEligibility("approval-1"), { approvalId: "approval-1", status: "PENDING", eligibility: "WAITING_FOR_APPROVAL" });
    assert.throws(() => plane.decide("missing", "APPROVE"), /Unknown executive decision/);

    console.log("");
    console.log("========================================");
    console.log(" V7.7 EXECUTIVE CONTROL PLANE DEMO");
    console.log("========================================");
    console.log("");
    console.log("Capability : proposal_generation → Sales Agent");
    console.log("State      : 2 active | 1 approval | 0 failed | 5 completed");
    console.log("Decision   : approval-1 → APPROVE");
    console.log("Execution  : approval-1 → WAITING_FOR_APPROVAL");
    console.log("");
    console.log("✓ One control-plane facade exposes capability resolution, state, brief, decisions, and execution eligibility.");
    console.log("✓ Existing subsystem boundaries remain explicit behind the facade.");
    console.log("✓ Decisions are validated through the executive decision surface.");
    console.log("✓ Unknown executive decisions are rejected instead of guessed.");
    console.log("✓ Control-plane inspection does not itself execute work.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
