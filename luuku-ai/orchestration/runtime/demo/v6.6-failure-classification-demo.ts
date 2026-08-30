import assert from "node:assert/strict";
import { classifyFailure } from "../failure-classification.js";

function main() {
    const transient = classifyFailure({
        summary: "Provider timed out.",
        attempts: 1,
        maxAttempts: 3,
        errorCode: "TIMEOUT",
    });
    assert.equal(transient.class, "transient");
    assert.equal(transient.action, "retry");

    const permanent = classifyFailure({
        summary: "Invalid customer identifier.",
        attempts: 1,
        maxAttempts: 3,
        errorCode: "INVALID_INPUT",
    });
    assert.equal(permanent.class, "permanent");
    assert.equal(permanent.action, "fail");

    const approval = classifyFailure({
        summary: "Founder approval required.",
        attempts: 1,
        maxAttempts: 3,
        errorCode: "APPROVAL_REQUIRED",
    });
    assert.equal(approval.class, "approval_required");
    assert.equal(approval.action, "block");

    const uncertain = classifyFailure({
        summary: "Process exited after provider call.",
        attempts: 1,
        maxAttempts: 3,
        executed: true,
        verified: false,
    });
    assert.equal(uncertain.class, "uncertain");
    assert.equal(uncertain.action, "reconcile");

    const exhausted = classifyFailure({
        summary: "Operation still failing.",
        attempts: 3,
        maxAttempts: 3,
    });
    assert.equal(exhausted.class, "max_attempts");
    assert.equal(exhausted.action, "escalate");

    console.log("");
    console.log("========================================");
    console.log(" V6.6 FAILURE CLASSIFICATION DEMO");
    console.log("========================================");
    console.log("");
    console.log("TIMEOUT              → transient       → RETRY");
    console.log("INVALID_INPUT        → permanent       → FAIL");
    console.log("APPROVAL_REQUIRED    → approval        → BLOCK");
    console.log("UNVERIFIED EXECUTION → uncertain       → RECONCILE");
    console.log("MAX ATTEMPTS         → max_attempts    → ESCALATE");
    console.log("");
    console.log("✓ Transient failures retry.");
    console.log("✓ Permanent failures terminate without blind retry.");
    console.log("✓ Approval-required work blocks for intervention.");
    console.log("✓ Uncertain execution requires reconciliation.");
    console.log("✓ Exhausted retries escalate instead of looping forever.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main();
