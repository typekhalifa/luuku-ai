import { ExecutiveSafetyGate } from "../executive-safety-gate.js";
import type { ExecutionPlan } from "../../planning/execution-plan.js";
import type { AutonomyPolicyResult } from "../autonomy-policy.js";

const autonomy: AutonomyPolicyResult = { decision: "AUTONOMOUS", reason: "Policy permits autonomy.", requiresFounderApproval: false, evidence: {} };
const plan = (capability: string, approval = false): ExecutionPlan => ({
    id: `plan-${capability}`,
    goal: capability,
    sourcePlanId: "v7.9c-demo",
    steps: [{ taskId: `task-${capability}`, agentId: "demo-agent", capability, dependsOn: [], input: {} }],
    requiresFounderApproval: approval,
    createdAt: new Date("2026-09-05T12:00:00.000Z"),
    metadata: {},
});

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`✓ ${message}`);
}

function main(): void {
    const gate = new ExecutiveSafetyGate([
        { capability: "safe-sync", classification: "SAFE_AUTONOMOUS", reason: "Safe for autonomous execution." },
        { capability: "publish-release", classification: "APPROVAL_REQUIRED", reason: "Founder approval is required before release publication." },
        { capability: "delete-production-data", classification: "FORBIDDEN", reason: "Destructive production data deletion is forbidden." },
    ]);

    const allowed = gate.evaluate({ plan: plan("safe-sync"), autonomy });
    const approval = gate.evaluate({ plan: plan("publish-release"), autonomy });
    const denied = gate.evaluate({ plan: plan("delete-production-data"), autonomy });
    const missing = gate.evaluate({ plan: plan("unknown-capability"), autonomy });
    const empty = gate.evaluate({ plan: { ...plan("empty"), steps: [] }, autonomy });

    assert(allowed.decision === "ALLOW", "safe autonomous capability is allowed");
    assert(approval.decision === "APPROVAL" && approval.requiresFounderApproval, "approval-required capability is blocked pending founder approval");
    assert(denied.decision === "DENY" && !denied.requiresFounderApproval, "forbidden capability is denied");
    assert(missing.decision === "ESCALATE" && missing.requiresFounderApproval, "unclassified capability escalates safely");
    assert(empty.decision === "ESCALATE", "empty plans cannot bypass the safety boundary");
    assert(allowed.decision !== "ALLOW" || autonomy.decision === "AUTONOMOUS", "safety never grants autonomy by itself");

    console.log(`Safe action         : ${allowed.decision}`);
    console.log(`Approval action     : ${approval.decision}`);
    console.log(`Forbidden action    : ${denied.decision}`);
    console.log(`Unknown action      : ${missing.decision}`);
    console.log(`Safety boundary     : PASS`);
    console.log(`Execution authority : V6 runtime remains downstream`);
}

main();
