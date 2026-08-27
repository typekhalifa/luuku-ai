import { QueueItem, QueueStore } from "../queue/queue";
import { Scheduler, ScheduleItemInput } from "../scheduler/scheduler";
import { Workflow } from "./workflow";
import { WorkflowOrchestrator } from "./workflow-orchestrator";

export interface AutonomousRuntimeCycleResult {
    scheduled: string[];
    claimed: string[];
    executed: string[];
    completed: string[];
}

export class AutonomousRuntime {
    constructor(
        private readonly scheduler: Scheduler,
        private readonly queue: QueueStore,
        private readonly orchestrator: WorkflowOrchestrator,
    ) {}

    async scheduleRunnableSteps(
        workflow: Workflow,
        availableAt = new Date(),
    ): Promise<QueueItem[]> {
        const runnable = workflow.steps.filter((step) => step.status === "READY");
        const scheduled: QueueItem[] = [];

        for (const step of runnable) {
            const input: ScheduleItemInput = {
                id: `${workflow.id}:${step.id}`,
                workflowId: workflow.id,
                stepId: step.id,
                agentId: step.agentId,
                availableAt,
                priority: step.priority,
                metadata: {
                    workflowId: workflow.id,
                    stepId: step.id,
                    source: "v6-autonomous-runtime",
                },
            };

            try {
                scheduled.push(await this.scheduler.schedule(input));
            } catch (error) {
                if (!(error instanceof Error) || !error.message.includes("already exists")) {
                    throw error;
                }
            }
        }

        return scheduled;
    }

    async runCycle(
        workflow: Workflow,
        now = new Date(),
    ): Promise<AutonomousRuntimeCycleResult> {
        const scheduled = await this.scheduleRunnableSteps(workflow, now);
        const claimed: string[] = [];
        const completed: string[] = [];

        const next = await this.queue.claimNext(now);
        if (!next) {
            return {
                scheduled: scheduled.map((item) => item.id),
                claimed,
                executed: [],
                completed,
            };
        }

        claimed.push(next.id);

        const orchestration = await this.orchestrator.runReadySteps(workflow);
        const executed = orchestration.executedStepIds;

        if (executed.includes(next.stepId)) {
            await this.queue.complete(next.id, now);
            completed.push(next.id);
        }

        return {
            scheduled: scheduled.map((item) => item.id),
            claimed,
            executed,
            completed,
        };
    }
}
