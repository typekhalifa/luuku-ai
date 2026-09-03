import { QueueItem, QueueItemStatus, QueueStore } from "../queue/queue";
import { Scheduler, ScheduleItemInput } from "../scheduler/scheduler";
import { FailurePolicy, defaultFailurePolicy } from "../runtime/failure-policy.js";
import { classifyFailure } from "../runtime/failure-classification.js";
import { RuntimeEventBus } from "../runtime/runtime-events.js";
import { Workflow } from "./workflow";
import { WorkflowEngine } from "./workflow-engine";
import { WorkflowOrchestrator } from "./workflow-orchestrator";
import { WorkflowStatus } from "./workflow-status";
import { WorkflowStore } from "./workflow-store";

export interface AutonomousRuntimeCycleResult { scheduled: string[]; recovered: string[]; claimed: string[]; executed: string[]; completed: string[]; retried: string[]; failed: string[]; blocked: string[]; reconciled: string[]; escalated: string[]; }
export interface AutonomousRuntimeOptions { queueClaimStaleAfterMs?: number; failurePolicy?: FailurePolicy; events?: RuntimeEventBus; }
const DEFAULT_QUEUE_CLAIM_STALE_AFTER_MS = 5 * 60 * 1000;

export class AutonomousRuntime {
    private readonly queueClaimStaleAfterMs: number; private readonly failurePolicy: FailurePolicy; private readonly events: RuntimeEventBus;
    constructor(private readonly scheduler: Scheduler, private readonly queue: QueueStore, private readonly orchestrator: WorkflowOrchestrator, private readonly workflowStore?: WorkflowStore, options: AutonomousRuntimeOptions = {}) {
        this.queueClaimStaleAfterMs = options.queueClaimStaleAfterMs ?? DEFAULT_QUEUE_CLAIM_STALE_AFTER_MS; this.failurePolicy = options.failurePolicy ?? defaultFailurePolicy; this.events = options.events ?? new RuntimeEventBus();
        if (this.queueClaimStaleAfterMs < 0) throw new Error("queueClaimStaleAfterMs must be non-negative."); if (this.failurePolicy.maxAttempts < 1) throw new Error("failurePolicy.maxAttempts must be at least 1.");
    }
    get eventBus(): RuntimeEventBus { return this.events; }
    async scheduleRunnableSteps(workflow: Workflow, availableAt = new Date()): Promise<QueueItem[]> {
        const decision = new WorkflowEngine().evaluate(workflow); const runnableIds = new Set(decision.runnableStepIds); const scheduled: QueueItem[] = [];
        for (const step of workflow.steps) { if (!runnableIds.has(step.id)) continue; const id = `${workflow.id}:${step.id}`; const existing = await this.queue.get(id); if (existing && [QueueItemStatus.QUEUED, QueueItemStatus.CLAIMED, QueueItemStatus.COMPLETED].includes(existing.status)) continue;
            const input: ScheduleItemInput = { id, workflowId: workflow.id, stepId: step.id, agentId: step.agentId, availableAt, priority: step.priority, metadata: { workflowId: workflow.id, stepId: step.id, source: "v6-autonomous-runtime" } };
            try { scheduled.push(await this.scheduler.schedule(input)); } catch (error) { if (!(error instanceof Error) || !error.message.includes("already exists")) throw error; }
        } return scheduled;
    }
    async runCycle(workflow: Workflow, now = new Date()): Promise<AutonomousRuntimeCycleResult> {
        const recovered = await this.queue.recoverStaleClaims(now, this.queueClaimStaleAfterMs); let scheduled = await this.scheduleRunnableSteps(workflow, now);
        const claimed: string[] = [], completed: string[] = [], retried: string[] = [], failed: string[] = [], blocked: string[] = [], reconciled: string[] = [], escalated: string[] = [];
        const next = await this.queue.claimNext(now); if (!next) { if (this.workflowStore) await this.workflowStore.save(workflow); return { scheduled: scheduled.map(x => x.id), recovered, claimed, executed: [], completed, retried, failed, blocked, reconciled, escalated }; }
        claimed.push(next.id); const orchestration = await this.orchestrator.runReadySteps(workflow, next.stepId); const executed = orchestration.executedStepIds; const result = orchestration.results[next.stepId]; const step = workflow.steps.find(x => x.id === next.stepId);
        if (executed.includes(next.stepId)) {
            if (this.workflowStore && WorkflowEngine.allStepsCompleted(workflow.steps)) {
                workflow.status = WorkflowStatus.COMPLETED;
            }
            if (this.workflowStore) await this.workflowStore.save(workflow); await this.queue.complete(next.id, now); completed.push(next.id);
            await this.events.publish({ type: "workflow.step.completed", workflowId: workflow.id, stepId: next.stepId, occurredAt: now });
            const continuation = await this.scheduleRunnableSteps(workflow, now); scheduled = [...scheduled, ...continuation];
        } else if (result && step) {
            const classification = classifyFailure({ summary: result.summary, executionStatus: result.executionStatus, executed: result.executed, verified: result.verified, attempts: next.attempts, maxAttempts: this.failurePolicy.maxAttempts });
            if (classification.action === "retry") { step.status = "READY"; const retryAt = new Date(now.getTime() + Math.min(this.failurePolicy.baseBackoffMs * (2 ** Math.max(0, next.attempts - 1)), this.failurePolicy.maxBackoffMs)); await this.queue.retry(next.id, retryAt); if (this.workflowStore) await this.workflowStore.save(workflow); retried.push(next.id); await this.events.publish({ type: "workflow.step.retry.scheduled", workflowId: workflow.id, stepId: next.stepId, occurredAt: now, metadata: { retryAt: retryAt.toISOString() } }); }
            else if (classification.action === "reconcile") { await this.queue.fail(next.id, now); if (this.workflowStore) await this.workflowStore.save(workflow); reconciled.push(next.id); await this.events.publish({ type: "workflow.step.reconciliation_required", workflowId: workflow.id, stepId: next.stepId, occurredAt: now }); }
            else if (classification.action === "block") { await this.queue.fail(next.id, now); if (this.workflowStore) await this.workflowStore.save(workflow); blocked.push(next.id); await this.events.publish({ type: "workflow.step.blocked", workflowId: workflow.id, stepId: next.stepId, occurredAt: now }); }
            else if (classification.action === "escalate") { await this.queue.fail(next.id, now); if (this.workflowStore) await this.workflowStore.save(workflow); escalated.push(next.id); await this.events.publish({ type: "workflow.step.escalated", workflowId: workflow.id, stepId: next.stepId, occurredAt: now }); }
            else { await this.queue.fail(next.id, now); if (this.workflowStore) await this.workflowStore.save(workflow); failed.push(next.id); await this.events.publish({ type: "workflow.step.failed", workflowId: workflow.id, stepId: next.stepId, occurredAt: now }); }
        } else { await this.queue.fail(next.id, now); if (this.workflowStore) await this.workflowStore.save(workflow); failed.push(next.id); await this.events.publish({ type: "workflow.step.failed", workflowId: workflow.id, stepId: next.stepId, occurredAt: now }); }
        return { scheduled: scheduled.map(x => x.id), recovered, claimed, executed, completed, retried, failed, blocked, reconciled, escalated };
    }
    async runPersistedCycle(workflowId: string, now = new Date()): Promise<AutonomousRuntimeCycleResult> { if (!this.workflowStore) throw new Error("AutonomousRuntime requires a WorkflowStore for persisted cycles."); const workflow = await this.workflowStore.get(workflowId); if (!workflow) throw new Error(`Workflow ${workflowId} was not found.`); return this.runCycle(workflow, now); }
}
