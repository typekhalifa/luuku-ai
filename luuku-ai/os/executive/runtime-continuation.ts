import type { QueueStore } from "../../orchestration/queue/queue.js";
import type { QueueItem } from "../../orchestration/queue/queue.js";
import { QueueScheduler } from "../../orchestration/scheduler/scheduler.js";
import { WorkflowOrchestrator } from "../../orchestration/workflow/workflow-orchestrator.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";

export interface RuntimeContinuationResult {
    readonly status: "SCHEDULED" | "ALREADY_SCHEDULED" | "WAITING" | "BLOCKED" | "NOT_FOUND";
    readonly workflowId: string;
    readonly scheduledItems: readonly QueueItem[];
    readonly waitingStepIds: readonly string[];
    readonly reason: string;
}

/** Continues an eligible durable workflow into the canonical V6 queue without executing agents. */
export class ExecutiveRuntimeContinuation {
    private readonly scheduler: QueueScheduler;
    private readonly evaluator: WorkflowOrchestrator;

    constructor(
        private readonly workflowStore: WorkflowStore,
        private readonly queueStore: QueueStore,
    ) {
        this.scheduler = new QueueScheduler(queueStore);
        this.evaluator = new WorkflowOrchestrator();
    }

    async continue(workflowId: string, availableAt = new Date()): Promise<RuntimeContinuationResult> {
        const workflow = await this.workflowStore.get(workflowId);
        if (!workflow) {
            return {
                status: "NOT_FOUND",
                workflowId,
                scheduledItems: [],
                waitingStepIds: [],
                reason: "Durable workflow was not found.",
            };
        }

        const evaluation = await this.evaluator.runReadySteps(workflow);
        if (evaluation.requiresApproval) {
            return {
                status: "BLOCKED",
                workflowId,
                scheduledItems: [],
                waitingStepIds: [],
                reason: "Workflow is awaiting founder approval and cannot enter the runtime queue.",
            };
        }

        if (evaluation.runnableStepIds.length === 0) {
            return {
                status: "WAITING",
                workflowId,
                scheduledItems: [],
                waitingStepIds: evaluation.waitingStepIds,
                reason: "No runnable workflow steps are currently available.",
            };
        }

        const scheduledItems: QueueItem[] = [];
        for (const stepId of evaluation.runnableStepIds) {
            const step = workflow.steps.find((candidate) => candidate.id === stepId);
            if (!step) continue;

            // V6 AutonomousRuntime uses this exact canonical identity. Reuse it here so
            // executive continuation and V6 runtime share one durable queue item rather
            // than creating an executive shadow item that the runtime would duplicate.
            const queueId = `${workflow.id}:${step.id}`;
            const existing = await this.queueStore.get(queueId);
            if (existing) continue;

            const item = await this.scheduler.schedule({
                id: queueId,
                workflowId: workflow.id,
                stepId: step.id,
                agentId: step.agentId,
                availableAt,
                priority: step.priority,
                metadata: {
                    source: "executive-runtime-continuation",
                    workflowId: workflow.id,
                    stepId: step.id,
                    capability: step.capability,
                },
            });
            scheduledItems.push(item);
        }

        const alreadyScheduled = scheduledItems.length === 0;
        return {
            status: alreadyScheduled ? "ALREADY_SCHEDULED" : "SCHEDULED",
            workflowId: workflow.id,
            scheduledItems,
            waitingStepIds: evaluation.waitingStepIds,
            reason: alreadyScheduled
                ? "Runnable workflow steps were already present in the canonical V6 queue."
                : "Runnable workflow steps were submitted to the canonical V6 scheduler queue.",
        };
    }
}
