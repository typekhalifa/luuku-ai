import assert from "node:assert/strict";
import { FounderApprovalGateway, ApprovalPolicy } from "../approval-gateway.js";

class DemoPolicy implements ApprovalPolicy {
    private readonly protectedActions = new Set(["send_external_proposal", "issue_invoice", "deploy_production"]);

    requiresApproval(action: string): boolean {
        return this.protectedActions.has(action);
    }
}

async function main() {
    const gateway = new FounderApprovalGateway(new DemoPolicy());

    const routine = gateway.evaluate({
        id: "approval-routine-1",
        action: "research_company",
        requestedBy: "research",
    });

    const protectedAction = gateway.evaluate({
        id: "approval-protected-1",
        action: "send_external_proposal",
        requestedBy: "sales",
        reason: "Proposal is ready for external delivery.",
    });

    assert.deepEqual(routine, { decision: "AUTO" });
    assert.equal(protectedAction.decision, "REQUIRES_APPROVAL");
    assert.equal(protectedAction.request?.id, "approval-protected-1");
    assert.equal(protectedAction.request?.action, "send_external_proposal");
    assert.equal(protectedAction.request?.requestedBy, "sales");
    assert.equal(protectedAction.request?.reason, "Proposal is ready for external delivery.");
    assert.ok(protectedAction.request?.createdAt instanceof Date);

    console.log("");
    console.log("========================================");
    console.log(" V7.5 FOUNDER APPROVAL GATEWAY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Routine action   : research_company → AUTO");
    console.log("Protected action : send_external_proposal → APPROVAL REQUIRED");
    console.log("Approval request : durable-ready identity + reason + requester");
    console.log("");
    console.log("✓ Routine work can proceed without founder intervention.");
    console.log("✓ Protected work is converted into an explicit approval request.");
    console.log("✓ Approval requests preserve action, requester, reason, and identity.");
    console.log("✓ The gateway makes no approval decision on behalf of the founder.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
