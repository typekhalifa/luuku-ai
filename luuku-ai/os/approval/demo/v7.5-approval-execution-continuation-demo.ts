import assert from "node:assert/strict";
import { FounderApprovalGateway } from "../approval-gateway.js";
import { ApprovalExecutionGate } from "../approval-execution-gate.js";
import { ApprovalStore } from "../approval-store.js";

async function main() {
    const gateway = new FounderApprovalGateway({
        requiresApproval: (action) => action === "send_external_proposal",
    });
    const store = new ApprovalStore();
    const gate = new ApprovalExecutionGate(store);

    const approval = gateway.evaluate({
        id: "approval-v75c-1",
        action: "send_external_proposal",
        requestedBy: "sales",
        reason: "Proposal is ready for external delivery.",
    });
    const request = store.create(approval.request!);

    assert.equal(gate.evaluate(request.id).eligibility, "WAITING_FOR_APPROVAL");

    let sideEffects = 0;
    if (gate.evaluate(request.id).eligibility === "READY") sideEffects += 1;
    assert.equal(sideEffects, 0);

    store.decide(request.id, "APPROVED", "founder");
    assert.equal(gate.evaluate(request.id).eligibility, "READY");
    if (gate.evaluate(request.id).eligibility === "READY") sideEffects += 1;
    assert.equal(sideEffects, 1);

    const rejectedApproval = gateway.evaluate({
        id: "approval-v75c-2",
        action: "send_external_proposal",
        requestedBy: "sales",
    });
    const rejectedRequest = store.create(rejectedApproval.request!);
    store.decide(rejectedRequest.id, "REJECTED", "founder");
    assert.equal(gate.evaluate(rejectedRequest.id).eligibility, "REJECTED");
    if (gate.evaluate(rejectedRequest.id).eligibility === "READY") sideEffects += 1;
    assert.equal(sideEffects, 1);

    console.log("");
    console.log("========================================");
    console.log(" V7.5 APPROVAL → EXECUTION CONTINUATION DEMO");
    console.log("========================================");
    console.log("");
    console.log("Before founder decision : PENDING → execution blocked");
    console.log("After APPROVE           : APPROVED → execution READY");
    console.log("After REJECT            : REJECTED → execution blocked");
    console.log("Side effects            : 1 (approved path only)");
    console.log("");
    console.log("✓ Pending approval blocks execution.");
    console.log("✓ Founder approval makes the protected action eligible to continue.");
    console.log("✓ Founder rejection keeps execution blocked.");
    console.log("✓ Only the approved path produces a simulated side effect.");
    console.log("✓ Approval state is evaluated without bypassing the approval store.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
