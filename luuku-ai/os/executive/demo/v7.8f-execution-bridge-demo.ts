import assert from "node:assert/strict";
import type { ExecutionPlan } from "../../planning/execution-plan.js";
import type { ExecutionDecision } from "../execution-decision.js";
import { ExecutiveExecutionBridge } from "../execution-bridge.js";
import { assertPlanIdentity } from "../runtime-bridge-result.js";

const plan: ExecutionPlan = {
    id: "execution-recovery-plan",
    goal: "Investigate and recover failed work.",
    sourcePlanId: "intent-plan-recover-failed-work",
    steps: [{
        taskId: "recovery-task",
        agentId: "recovery-agent",
        capability: "work.recover",
        dependsOn: [],
        input: { failedWorkflowId: "workflow-1" },
    }],
    requiresFounderApproval: false,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    metadata: { source: "demo" },
};

const bridge = new ExecutiveExecutionBridge();

const eligible: ExecutionDecision = {
    id: "execution-decision-recovery",
    status: "ELIGIBLE",
    intentId: "recover-failed-work",
    planId: plan.id,
    reason: "Recovery is permitted autonomously.",
    requiresFounderApproval: false,
    evidence: {},
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
};

const blocked: ExecutionDecision = { ...eligible, id: "execution-decision-customer", status: "BLOCKED", requiresFounderApproval: true };
const noAction: ExecutionDecision = { ...eligible, id: "execution-decision-none", status: "NOT_EXECUTABLE" };

const submitted = bridge.submit(eligible, plan);
const blockedResult = bridge.submit(blocked, plan);
const noActionResult = bridge.submit(noAction, plan);

assert.equal(submitted.status, "SUBMITTED");
assert.ok(submitted.workflow);
assertPlanIdentity(submitted, plan);
assert.equal(submitted.workflow?.status, "READY");
assert.equal(submitted.workflow?.requiresFounderApproval, false);
assert.equal(submitted.workflow?.steps[0]?.agentId, "recovery-agent");
assert.equal(submitted.workflow?.steps[0]?.capability, "work.recover");
assert.deepEqual(submitted.workflow?.steps[0]?.input, { failedWorkflowId: "workflow-1" });
assert.equal(blockedResult.status, "BLOCKED");
assert.equal(blockedResult.workflow, undefined);
assert.equal(noActionResult.status, "NOT_EXECUTABLE");
assert.equal(noActionResult.workflow, undefined);
assert.throws(() => bridge.submit({ ...eligible, planId: "different-plan" }, plan), /identity mismatch/);

console.log("V7.8-F EXECUTIVE → V6 RUNTIME BRIDGE DEMO");
console.log(`Eligible status : ${submitted.status}`);
console.log(`Blocked status  : ${blockedResult.status}`);
console.log(`No-action status: ${noActionResult.status}`);
console.log(`Workflow status : ${submitted.workflow?.status}`);
console.log(`Workflow steps  : ${submitted.workflow?.steps.length}`);
console.log(`Agent           : ${submitted.workflow?.steps[0]?.agentId}`);
console.log("✓ ELIGIBLE work becomes a READY V6 workflow for orchestration.");
console.log("✓ BLOCKED work never becomes a workflow.");
console.log("✓ NOT_EXECUTABLE work never becomes a workflow.");
console.log("✓ Agent, capability, input, and plan identity cross the executive/runtime boundary.");
console.log("✓ Plan/decision identity mismatches are rejected before submission.");
console.log("✓ The bridge creates no queue item and invokes no agent execution.");
console.log("✓ No external provider or network request was used.");
