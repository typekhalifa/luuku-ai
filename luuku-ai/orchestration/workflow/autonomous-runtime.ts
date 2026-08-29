import { QueueItem, QueueItemStatus, QueueStore } from "../queue/queue";
import { Scheduler, ScheduleItemInput } from "../scheduler/scheduler";
import { Workflow } from "./workflow";
import { WorkflowEngine } from "./workflow-engine";
import { WorkflowOrchestrator } from "./workflow-orchestrator";
import { WorkflowStore } from "./workflow-store";

export interface AutonomousRuntimeCycleResult {
    scheduled: string[];
    recovered: string[];
    claimed: string[];
    executed: string[];
    completed: string[];
}

export interface AutonomousRuntimeOptions {
    queueClaimStaleAfterMs?: number;
}

const DEFAULT_QUEUE_CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

export class AutonomousRuntime {
    private readonly queueClaimStaleAfterMs: number;

    constructor(
        private readonly scheduler: Scheduler,
        private readonly queue: QueueStore,
        private readonly orchestrator: WorkflowOrchestrator,
        private readonly workflowStore?: WorkflowStore,
        options: AutonomousRuntimeOptions = {},
    ) {
        this.queueClaimStaleAfterMs = options.queueClaimStaleAfterMs
            ?? DEFAULT_QUEUE_CLAIM_STALE_AFTER_MS;

        if (this.queueClaimStaleAfterMs < 0) {
            throw new Error("queueClaimStaleAfterMs must be non-negative.");
        }
    }

    async scheduleRunnableSteps(workflow: Workflow, availableAt = new Date()): Promise<QueueItem[]> {
        const decision = new WorkflowEngine().evaluate(workflow);
        const runnableIds = new Set(decision.runnableStepIds);
        const scheduled: QueueItem[] = [];

        for (const step of workflow.steps) {
            if (!runnableIds.has(step.id)) continue;

            const id = `${workflow.id}:${step.id}`;
            const existing = await this.queue.get(id);

            // Scheduling is idempotent across runtime restarts. A recovered or
            // already-active queue item must not be inserted a second time.
            if (existing && [
                QueueItemStatus.QUEUED,
                QueueItemStatus.CLAIMED,
                QueueItemStatus.COMPLETED,
            ].includes(existing.status)) {
                continue;
            }

            const input: ScheduleItemInput = {
                id,
                workflowId: workflow.id,
                stepId: step.id,
                agentId: step.agentId,
                availableAt,
                priority: step.priority,
                metadata: { workflowId: workflow.id, stepId: step.id, source: "v6-autonomous-runtime" },
            };

            try {
                scheduled.push(await this.scheduler.schedule(input));
            } catch (error) {
                if (!(error instanceof Error) || !error.message.includes("already exists")) throw error;
            }
        }

        return scheduled;
    }

    async runCycle(workflow: Workflow, now = new Date()): Promise<AutonomousRuntimeCycleResult> {
        const recovered = await this.queue.recoverStaleClaims(now, this.queueClaimStaleAfterMs);
        const scheduled = await this.scheduleRunnableSteps(workflow, now);
        const claimed: string[] = [];
        const completed: string[] = [];

        const next = await this.queue.claimNext(now);
        if (!next) {
            if (this.workflowStore) await this.workflowStore.save(workflow);
            return { scheduled: scheduled.map((item) => item.id), recovered, claimed, executed: [], completed };
        }

        claimed.push(next.id);
        const orchestration = await this.orchestrator.runReadySteps(workflow, next.stepId);
        const executed = orchestration.executedStepIds;

        if (executed.includes(next.stepId)) {
            if (this.workflowStore) await this.workflowStore.save(workflow);
            await this.queue.complete(next.id, now);
            completed.push(next.id);
        }

        return { scheduled: scheduled.map((item) => item.id), recovered, claimed, executed, completed };
    }

    async runPersistedCycle(workflowId: string, now = new Date()): Promise<AutonomousRuntimeCycleResult> {
        if (!this.workflowStore) throw new Error("AutonomousRuntime requires a WorkflowStore for persisted cycles.");
        const workflow = await this.workflowStore.get(workflowId);
        if (!workflow) throw new Error(`Workflow ${workflowId} was not found.`);
        return this.runCycle(workflow, now);
    }
}
