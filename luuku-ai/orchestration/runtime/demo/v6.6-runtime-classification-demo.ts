import assert from "node:assert/strict";
import { classifyFailure } from "../failure-classification.js";

const cases = [
    { name: "transient", context: { summary: "Provider timed out.", attempts: 1, maxAttempts: 3, errorCode: "TIMEOUT" }, expected: ["transient", "retry"] },
    { name: "permanent", context: { summary: "Invalid input.", attempts: 1, maxAttempts: 3, errorCode: "INVALID_INPUT" }, expected: ["permanent", "fail"] },
    { name: "approval", context: { summary: "Founder approval required.", attempts: 1, maxAttempts: 3, errorCode: "APPROVAL_REQUIRED" }, expected: ["approval_required", "block"] },
    { name: "uncertain", context: { summary: "Provider call may have completed.", attempts: 1, maxAttempts: 3, executed: true, verified: false }, expected: ["uncertain", "reconcile"] },
    { name: "exhausted", context: { summary: "Still failing.", attempts: 3, maxAttempts: 3 }, expected: ["max_attempts", "escalate"] },
] as const;

function main() {
    for (const testCase of cases) {
        const result = classifyFailure(testCase.context);
        assert.deepEqual([result.class, result.action], testCase.expected);
    }

    console.log("");
    console.log("========================================");
    console.log(" V6.6 RUNTIME FAILURE CLASSIFICATION DEMO");
    console.log("========================================");
    console.log("");
    for (const testCase of cases) {
        const result = classifyFailure(testCase.context);
        console.log(`${testCase.name.padEnd(20)} → ${result.class.padEnd(16)} → ${result.action.toUpperCase()}`);
    }
    console.log("");
    console.log("✓ Runtime classification contract covers retry, fail, block, reconcile, and escalation.");
    console.log("✓ Classification is deterministic and bounded.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main();
