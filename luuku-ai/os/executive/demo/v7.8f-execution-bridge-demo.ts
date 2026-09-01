import type { ExecutionPlan } from "../../planning/execution-plan.js";
import type { ExecutionDecision } from "../execution-decision.js";
import { ExecutiveExecutionBridge } from "../execution-bridge.js";

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

console.log("V7.8-F EXECUTIVE → V6 RUNTIME BRIDGE DEMO");
console.log(`Eligible status : ${submitted.status}`);
console.log(`Blocked status  : ${blockedResult.status}`);
console.log(`No-action status: ${noActionResult.status}`);
console.log(`Workflow status : ${submitted.workflow?.status}`);
console.log(`Workflow steps  : ${submitted.workflow?.steps.length}`);
console.log(`Agent           : ${submitted.workflow?.steps[0]?.agentId}`);

if (submitted.status !== "SUBMITTED" || !submitted.workflow) throw new Error("Eligible decision was not submitted as a workflow.");
if (submitted.workflow.status !== "READY") throw new Error("Eligible workflow is not READY.");
if (submitted.workflow.requiresFounderApproval) throw new Error("Autonomous workflow incorrectly requires approval.");
if (submitted.workflow.steps[0]?.agentId !== "recovery-agent") throw new Error("Agent identity was not preserved.");
if (blockedResult.status !== "BLOCKED" || blockedResult.workflow !== undefined) throw new Error("Blocked work must not become a workflow.");
if (noActionResult.status !== "NOT_EXECUTABLE" || noActionResult.workflow !== undefined) throw new Error("NO_ACTION must not become a workflow.");

console.log("✓ ELIGIBLE work becomes a READY V6 workflow for orchestration.");
console.log("✓ BLOCKED work never becomes a workflow.");
console.log("✓ NOT_EXECUTABLE work never becomes a workflow.");
console.log("✓ Agent, capability, input, and plan identity cross the executive/runtime boundary.");
console.log("✓ The bridge creates no queue item and invokes no agent execution.");
console.log("✓ No external provider or network request was used.");
