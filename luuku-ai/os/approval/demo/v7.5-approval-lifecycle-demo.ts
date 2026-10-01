import assert from "node:assert/strict";
import { FounderApprovalGateway, ApprovalPolicy } from "../approval-gateway.js";
import { ApprovalStore } from "../approval-store.js";

class DemoPolicy implements ApprovalPolicy {
    requiresApproval(action: string): boolean { return action === "send_external_proposal"; }
}

async function main() {
    const gateway = new FounderApprovalGateway(new DemoPolicy());
    const store = new ApprovalStore();
    const resolution = gateway.evaluate({ id: "approval-v75-1", action: "send_external_proposal", requestedBy: "sales", reason: "Proposal is ready." });

    assert.equal(resolution.decision, "REQUIRES_APPROVAL");
    assert.ok(resolution.request);
    const pending = store.create(resolution.request!);
    assert.equal(pending.status, "PENDING");
    assert.equal(store.listPending().length, 1);

    const approved = store.decide(pending.id, "APPROVED", "founder");
    assert.equal(approved.status, "APPROVED");
    assert.equal(approved.decidedBy, "founder");
    assert.ok(approved.decidedAt instanceof Date);
    assert.equal(store.listPending().length, 0);
    assert.throws(() => store.decide(pending.id, "REJECTED", "founder"), /already decided/);

    const second = store.create(gateway.evaluate({ id: "approval-v75-2", action: "send_external_proposal", requestedBy: "sales" }).request!);
    const rejected = store.decide(second.id, "REJECTED", "founder");
    assert.equal(rejected.status, "REJECTED");

    console.log("");
    console.log("========================================");
    console.log(" V7.5 APPROVAL LIFECYCLE DEMO");
    console.log("========================================");
    console.log("");
    console.log("Initial state : PENDING");
    console.log("Founder       : APPROVED");
    console.log("Second request: REJECTED");
    console.log("Pending queue : 0");
    console.log("");
    console.log("✓ Approval requests enter a deterministic PENDING state.");
    console.log("✓ Founder decisions transition PENDING to APPROVED or REJECTED.");
    console.log("✓ Decisions record who decided and when.");
    console.log("✓ Decided requests cannot be decided twice.");
    console.log("✓ Pending requests can be enumerated for a future communication surface.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
