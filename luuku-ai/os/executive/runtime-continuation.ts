import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import type { QueueItem, QueueStore } from "../../orchestration/queue/queue.js";
import { QueueScheduler } from "../../orchestration/scheduler/scheduler.js";
import { WorkflowOrchestrator } from "../../orchestration/workflow/workflow-orchestrator.js";

export interface RuntimeContinuationResult {
    readonly status: "SCHEDULED" | "ALREADY_SCHEDULED" | "WAITING" | "NOT_FOUND";
    readonly workflowId: string;
    readonly scheduledItems: readonly QueueItem[];
    readonly waitingStepIds: readonly string[];
    readonly reason: string;
}

/** Continues an eligible durable workflow into V6 scheduling without executing agents. */
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

    async continue(workflowId: string): Promise<RuntimeContinuationResult> {
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

            const queueId = `executive:${workflow.id}:${step.id}`;
            const existing = await this.queueStore.get(queueId);
            if (existing) {
                continue;
            }

            const item = await this.scheduler.schedule({
                id: queueId,
                workflowId: workflow.id,
                stepId: step.id,
                agentId: step.agentId,
                availableAt: new Date(),
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

        const totalScheduled = scheduledItems.length;
        const alreadyScheduled = evaluation.runnableStepIds.length > 0 && totalScheduled === 0;
        return {
            status: alreadyScheduled ? "ALREADY_SCHEDULED" : "SCHEDULED",
            workflowId: workflow.id,
            scheduledItems,
            waitingStepIds: evaluation.waitingStepIds,
            reason: alreadyScheduled
                ? "Runnable workflow steps were already present in the durable queue."
                : "Runnable workflow steps were submitted to the V6 scheduler queue.",
        };
    }
}

export type { ExecutionPlan };
export type { Workflow };
