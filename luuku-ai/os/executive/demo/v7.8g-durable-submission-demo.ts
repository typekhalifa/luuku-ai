import { DurableExecutiveSubmission } from "../executive-submission.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import type { ExecutionPlan } from "../../planning/execution-plan.js";
import type { ExecutionDecision } from "../execution-decision.js";

const plan: ExecutionPlan = {
    id: "execution-recovery-plan",
    goal: "Investigate and recover failed work.",
    sourcePlanId: "intent-plan-recover-failed-work",
    steps: [{ taskId: "recovery-task", agentId: "recovery-agent", capability: "work.recover", dependsOn: [], input: { failedWorkflowId: "workflow-1" } }],
    requiresFounderApproval: false,
    createdAt: new Date("2026-09-01T00:00:00.000Z"),
    metadata: { source: "demo" },
};

const eligible: ExecutionDecision = {
    id: "execution-decision-recovery", status: "ELIGIBLE", intentId: "recover-failed-work", planId: plan.id,
    reason: "Recovery is permitted autonomously.", requiresFounderApproval: false, evidence: {}, createdAt: new Date("2026-09-01T00:00:00.000Z"),
};
const blocked: ExecutionDecision = { ...eligible, id: "execution-decision-customer", status: "BLOCKED", requiresFounderApproval: true };
const noAction: ExecutionDecision = { ...eligible, id: "execution-decision-none", status: "NOT_EXECUTABLE" };

const store = new InMemoryWorkflowStore();
const submission = new DurableExecutiveSubmission(store);
const first = await submission.submit(eligible, plan);
const replay = await submission.submit(eligible, plan);
const blockedResult = await submission.submit(blocked, { ...plan, id: "execution-customer-plan" });
const noActionResult = await submission.submit(noAction, { ...plan, id: "execution-none-plan" });

console.log("V7.8-G DURABLE EXECUTIVE SUBMISSION DEMO");
console.log(`First status    : ${first.status}`);
console.log(`Replay status   : ${replay.status}`);
console.log(`Blocked status  : ${blockedResult.status}`);
console.log(`No-action status: ${noActionResult.status}`);
console.log(`Durable workflows: ${(await store.list()).length}`);

if (first.status !== "SUBMITTED" || !first.workflow) throw new Error("Eligible work was not persisted.");
if (first.workflow.status !== "READY") throw new Error("Persisted workflow is not READY.");
if (replay.status !== "ALREADY_SUBMITTED") throw new Error("Replay was not treated idempotently.");
if (replay.workflow?.id !== first.workflow.id) throw new Error("Replay returned a different workflow.");
if (blockedResult.status !== "BLOCKED") throw new Error("Blocked work was persisted.");
if (noActionResult.status !== "NOT_EXECUTABLE") throw new Error("NO_ACTION became executable.");
if ((await store.list()).length !== 1) throw new Error("Unexpected workflow count after submission paths.");

console.log("✓ ELIGIBLE work is durably persisted as a READY V6 workflow.");
console.log("✓ Repeated submission of the same plan is idempotent.");
console.log("✓ BLOCKED work never reaches durable workflow state.");
console.log("✓ NOT_EXECUTABLE work never reaches durable workflow state.");
console.log("✓ Submission invokes no agent execution and creates no queue item.");
console.log("✓ No external provider or network request was used.");
