import type { QueueItem, QueueStore } from "../../orchestration/queue/queue.js";
import { QueueItemStatus } from "../../orchestration/queue/queue.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";
import { WorkflowStatus } from "../../orchestration/workflow/workflow-status.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import type { ExecutiveState } from "./executive-state.js";

export type ExecutionFeedbackStatus =
    | "COMPLETED"
    | "FAILED"
    | "WAITING_APPROVAL"
    | "IN_PROGRESS"
    | "CANCELLED";

export interface ExecutionFeedback {
    readonly id: string;
    readonly workflowId: string;
    readonly status: ExecutionFeedbackStatus;
    readonly workflowStatus: WorkflowStatus;
    readonly queueItemStatuses: readonly QueueItemStatus[];
    readonly message: string;
    readonly evidence: Record<string, unknown>;
    readonly observedAt: Date;
}

export interface ExecutionFeedbackSnapshot {
    readonly observedAt: Date;
    readonly feedback: readonly ExecutionFeedback[];
}

/** Reads V6 durable truth and converts workflow outcomes into executive feedback. */
export class DurableExecutionFeedbackSource {
    constructor(
        private readonly workflows: WorkflowStore,
        private readonly queue: QueueStore,
    ) {}

    async snapshot(): Promise<ExecutionFeedbackSnapshot> {
        const [workflowRecords, queueRecords] = await Promise.all([
            this.workflows.list(),
            this.queue.list(),
        ]);
        return project(workflowRecords, queueRecords);
    }
}

/** Projects execution feedback into the executive state without mutating durable truth. */
export class ExecutionFeedbackStateProjector {
    apply(state: ExecutiveState, snapshot: ExecutionFeedbackSnapshot): ExecutiveState {
        const outcomeAttention = snapshot.feedback
            .filter((item) => item.status === "COMPLETED" || item.status === "FAILED" || item.status === "CANCELLED")
            .map((item) => item.message);

        return {
            ...state,
            generatedAt: new Date(),
            attention: [...state.attention, ...outcomeAttention],
        };
    }
}

function project(
    workflows: readonly Workflow[],
    queue: readonly QueueItem[],
): ExecutionFeedbackSnapshot {
    const observedAt = new Date();
    const feedback = workflows.map((workflow) => {
        const relatedQueue = queue.filter((item) => item.workflowId === workflow.id);
        const status = toFeedbackStatus(workflow.status);

        return {
            id: `execution-feedback-${workflow.id}`,
            workflowId: workflow.id,
            status,
            workflowStatus: workflow.status,
            queueItemStatuses: relatedQueue.map((item) => item.status),
            message: messageFor(workflow, status),
            evidence: {
                workflowId: workflow.id,
                workflowStatus: workflow.status,
                queueItemCount: relatedQueue.length,
                failedQueueItemCount: relatedQueue.filter((item) => item.status === QueueItemStatus.FAILED).length,
            },
            observedAt,
        };
    });

    return { observedAt, feedback };
}

function toFeedbackStatus(status: WorkflowStatus): ExecutionFeedbackStatus {
    switch (status) {
        case WorkflowStatus.COMPLETED:
            return "COMPLETED";
        case WorkflowStatus.FAILED:
            return "FAILED";
        case WorkflowStatus.AWAITING_APPROVAL:
            return "WAITING_APPROVAL";
        case WorkflowStatus.CANCELLED:
            return "CANCELLED";
        case WorkflowStatus.READY:
        case WorkflowStatus.RUNNING:
        case WorkflowStatus.DRAFT:
            return "IN_PROGRESS";
    }
}

function messageFor(workflow: Workflow, status: ExecutionFeedbackStatus): string {
    switch (status) {
        case "COMPLETED":
            return `Workflow completed: ${workflow.goal} (${workflow.id}).`;
        case "FAILED":
            return `Workflow failed: ${workflow.goal} (${workflow.id}).`;
        case "WAITING_APPROVAL":
            return `Workflow is waiting for founder approval: ${workflow.goal} (${workflow.id}).`;
        case "CANCELLED":
            return `Workflow was cancelled: ${workflow.goal} (${workflow.id}).`;
        case "IN_PROGRESS":
            return `Workflow remains in progress: ${workflow.goal} (${workflow.id}).`;
    }
}
