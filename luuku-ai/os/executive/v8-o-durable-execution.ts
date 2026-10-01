import type { QueueItem, QueueStore } from "../../orchestration/queue/queue.js";
import { QueueItemStatus } from "../../orchestration/queue/queue.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";
import { WorkflowStatus } from "../../orchestration/workflow/workflow-status.js";

export type DurableExecutionState =
    | "READY"
    | "IN_FLIGHT"
    | "RECOVERABLE"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED"
    | "WORKFLOW_COMPLETED";

export type DurableExecutionAction =
    | "EXECUTE_THROUGH_V6"
    | "RECOVER_THROUGH_V6"
    | "ALREADY_COMPLETED"
    | "WAIT"
    | "ESCALATE";

export interface DurableExecutionRecord {
    readonly executionId: string;
    readonly workflowId: string;
    readonly stepId: string;
    readonly state: DurableExecutionState;
    readonly action: DurableExecutionAction;
    readonly attempts: number;
    readonly reason: string;
}

/**
 * V8-O is a recovery/idempotency boundary around V6 execution state.
 * It never executes a workflow itself and never creates a second execution authority.
 */
export class DurableExecutionRecoveryEngine {
    constructor(private readonly staleAfterMs = 5 * 60 * 1000) {
        if (staleAfterMs < 0) throw new Error("staleAfterMs must be non-negative.");
    }

    async inspect(workflow: Workflow, queue: QueueStore, now = new Date()): Promise<readonly DurableExecutionRecord[]> {
        if (!workflow.id) throw new Error("workflow.id is required.");
        if (!workflow.steps.length) throw new Error("workflow must contain at least one step.");

        const records: DurableExecutionRecord[] = [];
        for (const step of workflow.steps) {
            const executionId = `${workflow.id}:${step.id}`;
            const item = await queue.get(executionId);
            records.push(this.classify(workflow, step.id, item, now));
        }
        return records;
    }

    private classify(workflow: Workflow, stepId: string, item: QueueItem | null, now: Date): DurableExecutionRecord {
        const executionId = `${workflow.id}:${stepId}`;
        if (workflow.status === WorkflowStatus.COMPLETED) {
            return { executionId, workflowId: workflow.id, stepId, state: "WORKFLOW_COMPLETED", action: "ALREADY_COMPLETED", attempts: item?.attempts ?? 0, reason: "Workflow is durably marked completed." };
        }
        if (!item) {
            return { executionId, workflowId: workflow.id, stepId, state: "READY", action: "EXECUTE_THROUGH_V6", attempts: 0, reason: "No execution record exists; V6 may schedule the step." };
        }
        switch (item.status) {
            case QueueItemStatus.COMPLETED:
                return { executionId, workflowId: workflow.id, stepId, state: "COMPLETED", action: "ALREADY_COMPLETED", attempts: item.attempts, reason: "V6 queue state is durably completed." };
            case QueueItemStatus.CLAIMED:
                if (now.getTime() - item.updatedAt.getTime() >= this.staleAfterMs) {
                    return { executionId, workflowId: workflow.id, stepId, state: "RECOVERABLE", action: "RECOVER_THROUGH_V6", attempts: item.attempts, reason: "Claim is stale and may be recovered by the V6 runtime." };
                }
                return { executionId, workflowId: workflow.id, stepId, state: "IN_FLIGHT", action: "WAIT", attempts: item.attempts, reason: "V6 currently owns an active execution claim." };
            case QueueItemStatus.FAILED:
                return { executionId, workflowId: workflow.id, stepId, state: "FAILED", action: "ESCALATE", attempts: item.attempts, reason: "V6 recorded a terminal failure; retry/reconciliation remains a V6 concern." };
            case QueueItemStatus.CANCELLED:
                return { executionId, workflowId: workflow.id, stepId, state: "CANCELLED", action: "ESCALATE", attempts: item.attempts, reason: "V6 recorded cancellation; executive orchestration cannot silently re-execute it." };
            case QueueItemStatus.QUEUED:
                return { executionId, workflowId: workflow.id, stepId, state: "READY", action: "EXECUTE_THROUGH_V6", attempts: item.attempts, reason: "Step is durably queued for V6 execution." };
            default:
                return { executionId, workflowId: workflow.id, stepId, state: "FAILED", action: "ESCALATE", attempts: item.attempts, reason: "Unknown durable queue state." };
        }
    }
}
