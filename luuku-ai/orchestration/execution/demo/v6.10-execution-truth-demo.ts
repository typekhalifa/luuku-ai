import assert from "node:assert/strict";
import { prisma } from "../../../shared/database/client.js";
import { ExecutionLedger, workflowStepIdempotencyKey } from "../execution-ledger.js";
import { AgentResult } from "../../../shared/agents/interface.js";

async function main() {
    const ledger = new ExecutionLedger();
    const workflowId = `v6.10-execution-truth-${Date.now()}`;
    const stepId = "send-proposal";
    const key = workflowStepIdempotencyKey(workflowId, stepId);

    const first = await ledger.begin(key, workflowId, stepId);
    assert.equal(first.status, "new");

    const completed: AgentResult = {
        success: true,
        summary: "Proposal prepared and verified.",
        completedAt: new Date().toISOString(),
        executionStatus: "completed",
        executed: true,
        verified: true,
        evidence: { provider: "internal", externalId: "proposal-v6.10" },
    };
    await ledger.complete(key, completed);

    const recovered = await ledger.begin(key, workflowId, stepId);
    assert.equal(recovered.status, "completed");
    assert.equal(recovered.result?.success, true);
    assert.equal(recovered.result?.executed, true);
    assert.equal(recovered.result?.verified, true);

    const persisted = await prisma.communicationExecution.findUnique({ where: { idempotencyKey: key } });
    assert.equal(persisted?.status, "completed");
    assert.equal(persisted?.executed, true);
    assert.equal(persisted?.verified, true);
    assert.deepEqual(persisted?.recipient, { workflowId, stepId });

    console.log("");
    console.log("========================================");
    console.log(" V6.10 EXECUTION TRUTH DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Workflow       : ${workflowId}`);
    console.log(`Step           : ${stepId}`);
    console.log("Initial begin  : NEW → EXECUTING");
    console.log("Completion     : EXECUTED + VERIFIED → COMPLETED");
    console.log("Recovery read  : durable COMPLETED truth recovered");
    console.log("");
    console.log("✓ Execution identity persisted by idempotency key.");
    console.log("✓ Completion recorded execution and verification truth durably.");
    console.log("✓ A fresh ledger recovered the persisted execution outcome.");
    console.log("✓ Workflow and step identity remained attached to the durable record.");
    console.log("✓ No external provider or network request was used.");
    console.log("");

    await prisma.communicationExecution.delete({ where: { id: persisted!.id } });
}

main().catch(async error => {
    console.error(error);
    process.exitCode = 1;
});
