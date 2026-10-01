import { DurableExecutiveSubmission } from "../executive-submission.js";
import { ExecutiveRuntimeContinuation } from "../runtime-continuation.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import type { ExecutionPlan } from "../../planning/execution-plan.js";
import type { ExecutionDecision } from "../execution-decision.js";
import type { Workflow } from "../../../orchestration/workflow/workflow.js";

async function main(): Promise<void> {
    const workflowStore = new InMemoryWorkflowStore();
    const queueStore = new InMemoryQueueStore();
    const submission = new DurableExecutiveSubmission(workflowStore);
    const continuation = new ExecutiveRuntimeContinuation(workflowStore, queueStore);

    const plan: ExecutionPlan = {
        id: "execution-recovery-plan-h",
        goal: "Investigate and recover failed work.",
        sourcePlanId: "intent-plan-recover-failed-work",
        steps: [{ taskId: "recovery-task-h", agentId: "recovery-agent", capability: "work.recover", dependsOn: [], input: { failedWorkflowId: "workflow-1" } }],
        requiresFounderApproval: false,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        metadata: { source: "v7.8h-demo" },
    };
    const eligible: ExecutionDecision = {
        id: "execution-decision-recovery-h", status: "ELIGIBLE", intentId: "recover-failed-work", planId: plan.id,
        reason: "Recovery is permitted autonomously.", requiresFounderApproval: false, evidence: {}, createdAt: plan.createdAt,
    };

    const submitted = await submission.submit(eligible, plan);
    if (!submitted.workflow) throw new Error("Eligible workflow was not persisted.");

    const first = await continuation.continue(submitted.workflow.id);
    const replay = await continuation.continue(submitted.workflow.id);

    const approvalWorkflow: Workflow = {
        ...submitted.workflow,
        id: "approval-blocked-workflow",
        status: WorkflowStatus.AWAITING_APPROVAL,
        requiresFounderApproval: true,
        steps: submitted.workflow.steps.map((step) => ({ ...step, id: "approval-step", workflowId: "approval-blocked-workflow" })),
    };
    await workflowStore.create(approvalWorkflow);
    const blocked = await continuation.continue(approvalWorkflow.id);

    const queued = await queueStore.list();

    console.log("V7.8-H EXECUTIVE → V6 RUNTIME CONTINUATION DEMO");
    console.log(`First continuation : ${first.status}`);
    console.log(`Replay continuation: ${replay.status}`);
    console.log(`Approval path      : ${blocked.status}`);
    console.log(`Durable queue items: ${queued.length}`);
    console.log(`Queued workflow    : ${queued[0]?.workflowId ?? "none"}`);
    console.log(`Queued agent       : ${queued[0]?.agentId ?? "none"}`);

    if (first.status !== "SCHEDULED" || first.scheduledItems.length !== 1) throw new Error("Eligible workflow was not scheduled.");
    if (replay.status !== "ALREADY_SCHEDULED" || replay.scheduledItems.length !== 0) throw new Error("Runtime continuation was not idempotent.");
    if (blocked.status !== "BLOCKED" || blocked.scheduledItems.length !== 0) throw new Error("Approval-blocked workflow entered the queue.");
    if (queued.length !== 1) throw new Error("Unexpected durable queue item count.");
    if (queued[0].workflowId !== submitted.workflow.id) throw new Error("Wrong workflow entered the queue.");

    console.log("✓ Durable executive work continues into the existing V6 scheduler boundary.");
    console.log("✓ Repeated continuation does not duplicate the queue item.");
    console.log("✓ Founder-approval workflows remain blocked before queue submission.");
    console.log("✓ Continuation invokes no agent execution.");
    console.log("✓ No external provider or network request was used.");
}

void main();
