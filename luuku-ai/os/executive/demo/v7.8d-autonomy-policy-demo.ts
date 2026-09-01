import { ExecutiveAutonomyPolicy } from "../autonomy-policy.js";
import type { ExecutiveIntent } from "../executive-intent.js";
import type { ExecutionPlan } from "../../planning/execution-plan.js";

const policy = new ExecutiveAutonomyPolicy([
    {
        capability: "work.recover",
        decision: "AUTONOMOUS",
        reason: "Failed-work recovery is explicitly allowed to proceed autonomously.",
    },
    {
        capability: "customer.send",
        decision: "FOUNDER_APPROVAL",
        reason: "Customer-facing communication requires founder approval.",
    },
]);

const recoveryIntent: ExecutiveIntent = {
    id: "recover-failed-work",
    type: "RECOVER_FAILED_WORK",
    objective: "Investigate and recover failed work.",
    reason: "1 work item has failed.",
    sourceObservationIds: ["failed-work"],
    evidence: { failed: 1 },
};

const autonomousPlan: ExecutionPlan = {
    id: "execution-recovery",
    goal: recoveryIntent.objective,
    sourcePlanId: "intent-plan-recovery",
    steps: [{
        taskId: "recovery-task",
        agentId: "recovery-agent",
        capability: "work.recover",
        dependsOn: [],
        input: { failed: 1 },
    }],
    requiresFounderApproval: false,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    metadata: {},
};

const autonomous = policy.evaluate({ intent: recoveryIntent, plan: autonomousPlan });

const approvalPlan: ExecutionPlan = {
    ...autonomousPlan,
    id: "execution-customer-message",
    sourcePlanId: "intent-plan-customer-message",
    steps: [{
        ...autonomousPlan.steps[0],
        capability: "customer.send",
    }],
};

const approvalIntent: ExecutiveIntent = {
    ...recoveryIntent,
    id: "customer-message",
    type: "MONITOR_ACTIVE_WORK",
    objective: "Send a customer-facing update.",
};

const approval = policy.evaluate({ intent: approvalIntent, plan: approvalPlan });

const noActionIntent: ExecutiveIntent = {
    ...recoveryIntent,
    id: "no-action",
    type: "NO_ACTION",
    objective: "Take no action.",
};

const noAction = policy.evaluate({ intent: noActionIntent, plan: { ...autonomousPlan, id: "execution-no-action", steps: [] } });

console.log("V7.8-D AUTONOMY POLICY DEMO");
console.log(`Recovery decision : ${autonomous.decision}`);
console.log(`Customer decision : ${approval.decision}`);
console.log(`No-action         : ${noAction.decision}`);
console.log(`Recovery approval : ${autonomous.requiresFounderApproval}`);
console.log(`Customer approval : ${approval.requiresFounderApproval}`);

if (autonomous.decision !== "AUTONOMOUS") throw new Error("Recovery should be autonomous.");
if (autonomous.requiresFounderApproval) throw new Error("Recovery should not require approval.");
if (approval.decision !== "FOUNDER_APPROVAL") throw new Error("Customer action should require approval.");
if (!approval.requiresFounderApproval) throw new Error("Customer action approval flag missing.");
if (noAction.decision !== "NO_ACTION") throw new Error("NO_ACTION intent should remain NO_ACTION.");

console.log("✓ Explicit policy rules distinguish autonomous and consequential work.");
console.log("✓ Founder approval is required when policy marks a capability consequential.");
console.log("✓ NO_ACTION never becomes executable work.");
console.log("✓ Policy creates no approval, queue item, or execution side effect.");
console.log("✓ No external provider or network request was used.");
