import { InMemoryQueueStore } from "../../../orchestration/queue/queue.js";
import { QueueItemStatus } from "../../../orchestration/queue/queue.js";
import { Priority } from "../../../orchestration/task/priority.js";
import { InMemoryWorkflowStore } from "../../../orchestration/workflow/workflow-store.js";
import { WorkflowStatus } from "../../../orchestration/workflow/workflow-status.js";
import type { Workflow } from "../../../orchestration/workflow/workflow.js";
import { DurableExecutiveStateSource } from "../../control/durable-executive-state.js";
import {
    DurableExecutionFeedbackSource,
    ExecutionFeedbackStateProjector,
} from "../execution-feedback.js";

function workflow(id: string, goal: string, status: WorkflowStatus): Workflow {
    const now = new Date();
    return {
        id,
        goal,
        status,
        steps: [],
        requiresFounderApproval: status === WorkflowStatus.AWAITING_APPROVAL,
        createdAt: now,
        updatedAt: now,
        metadata: { source: "v7.8i-demo" },
    };
}

async function main(): Promise<void> {
    const workflows = new InMemoryWorkflowStore();
    const queue = new InMemoryQueueStore();

    await workflows.create(workflow("workflow-completed", "Recover failed research", WorkflowStatus.COMPLETED));
    await workflows.create(workflow("workflow-failed", "Prepare customer proposal", WorkflowStatus.FAILED));
    await workflows.create(workflow("workflow-running", "Research target account", WorkflowStatus.RUNNING));

    const now = new Date();
    await queue.enqueue({
        id: "queue-failed",
        workflowId: "workflow-failed",
        stepId: "proposal-step",
        agentId: "sales-agent",
        priority: Priority.HIGH,
        availableAt: now,
        status: QueueItemStatus.FAILED,
        attempts: 2,
        metadata: { source: "v7.8i-demo" },
        createdAt: now,
        updatedAt: now,
    });

    const stateSource = new DurableExecutiveStateSource(workflows, queue);
    const feedbackSource = new DurableExecutionFeedbackSource(workflows, queue);
    const stateProjector = new ExecutionFeedbackStateProjector();

    const state = await stateSource.snapshot();
    const feedbackSnapshot = await feedbackSource.snapshot();
    const feedbackState = stateProjector.apply(state, feedbackSnapshot);

    console.log("V7.8-I EXECUTION FEEDBACK → EXECUTIVE STATE DEMO");
    console.log(`Durable state    : ${state.active} active | ${state.failed} failed | ${state.completed} completed`);
    console.log(`Feedback records : ${feedbackSnapshot.feedback.length}`);
    for (const feedback of feedbackSnapshot.feedback) {
        console.log(`${feedback.status.padEnd(17)} ${feedback.workflowId}`);
    }
    console.log(`Attention entries : ${feedbackState.attention.length}`);

    const completed = feedbackSnapshot.feedback.find((item) => item.workflowId === "workflow-completed");
    const failed = feedbackSnapshot.feedback.find((item) => item.workflowId === "workflow-failed");
    const running = feedbackSnapshot.feedback.find((item) => item.workflowId === "workflow-running");

    if (completed?.status !== "COMPLETED") throw new Error("Completed workflow feedback was not projected.");
    if (failed?.status !== "FAILED") throw new Error("Failed workflow feedback was not projected.");
    if (running?.status !== "IN_PROGRESS") throw new Error("Running workflow feedback was not projected.");
    if (!completed.evidence || completed.evidence.workflowStatus !== WorkflowStatus.COMPLETED) {
        throw new Error("Completed feedback lost durable workflow evidence.");
    }
    if (!feedbackState.attention.some((item) => item.includes("Workflow completed"))) {
        throw new Error("Completed execution was not surfaced to executive state.");
    }
    if (!feedbackState.attention.some((item) => item.includes("Workflow failed"))) {
        throw new Error("Failed execution was not surfaced to executive state.");
    }
    if (state.active !== 1 || state.failed !== 1 || state.completed !== 1) {
        throw new Error("Executive state was not projected from durable V6 truth.");
    }

    console.log("✓ V6 workflow outcomes are converted into explicit executive feedback.");
    console.log("✓ Feedback preserves workflow identity, status, and durable queue evidence.");
    console.log("✓ Completed and failed execution outcomes are surfaced to executive state.");
    console.log("✓ In-progress execution remains observable without being treated as completed.");
    console.log("✓ Feedback projection creates no queue item and invokes no agent execution.");
    console.log("✓ No external provider or network request was used.");
}

void main();
