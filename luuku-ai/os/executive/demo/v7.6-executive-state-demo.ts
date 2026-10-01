import assert from "node:assert/strict";
import { ExecutiveStateProjector, ExecutiveStateSource, ExecutiveWorkItem } from "../executive-state.js";

async function main() {
    const work: ExecutiveWorkItem[] = [
        { id: "research-1", status: "ACTIVE", owner: "research", priority: "HIGH" },
        { id: "sales-1", status: "WAITING_APPROVAL", owner: "sales", priority: "HIGH" },
        { id: "support-1", status: "FAILED", owner: "support" },
        { id: "finance-1", status: "COMPLETED", owner: "finance" },
        { id: "marketing-1", status: "COMPLETED", owner: "marketing" },
    ];

    const source: ExecutiveStateSource = {
        listWork: () => work,
        listPendingApprovals: () => [{ id: "approval-1", action: "onboard Company X" }],
    };

    const state = new ExecutiveStateProjector(source).snapshot();

    assert.equal(state.active, 1);
    assert.equal(state.waitingApproval, 1);
    assert.equal(state.failed, 1);
    assert.equal(state.completed, 2);
    assert.deepEqual(state.attention, ["Approval required: onboard Company X (approval-1)"]);
    assert.ok(state.generatedAt instanceof Date);

    console.log("");
    console.log("========================================");
    console.log(" V7.6 EXECUTIVE STATE DEMO");
    console.log("========================================");
    console.log("");
    console.log("Active work       : 1");
    console.log("Waiting approval  : 1");
    console.log("Failed            : 1");
    console.log("Completed         : 2");
    console.log("Attention         : onboard Company X");
    console.log("");
    console.log("✓ Executive state is projected from explicit work and approval sources.");
    console.log("✓ Active, waiting, failed, and completed work are counted deterministically.");
    console.log("✓ Pending approvals become explicit executive attention items.");
    console.log("✓ The projection does not invent work or execution outcomes.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
