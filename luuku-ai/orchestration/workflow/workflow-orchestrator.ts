import { AgentResult } from "../../shared/agents/interface";
import { Workflow } from "./workflow";
import { WorkflowStep } from "./workflow-step";
import { WorkflowEngine } from "./workflow-engine";

export interface WorkflowStepExecutor {
    execute(step: WorkflowStep): Promise<AgentResult>;
}

export interface WorkflowOrchestrationResult {
    executedStepIds: string[];
    results: Record<string, AgentResult>;
    runnableStepIds: string[];
    waitingStepIds: string[];
    blockedStepIds: string[];
    requiresApproval: boolean;
}

/** V6 boundary between workflow coordination and real agent execution. */
export class WorkflowOrchestrator {
    constructor(
        private readonly engine = new WorkflowEngine(),
        private readonly executor?: WorkflowStepExecutor,
    ) {}

    async runReadySteps(workflow: Workflow, onlyStepId?: string): Promise<WorkflowOrchestrationResult> {
        const executedStepIds: string[] = [];
        const results: Record<string, AgentResult> = {};

        if (!this.executor) {
            const decision = this.engine.evaluate(workflow);
            return {
                executedStepIds, results,
                runnableStepIds: decision.runnableStepIds,
                waitingStepIds: decision.waitingStepIds,
                blockedStepIds: decision.blockedStepIds,
                requiresApproval: decision.requiresApproval,
            };
        }

        let decision = this.engine.evaluate(workflow);
        const runnableStepIds = onlyStepId
            ? decision.runnableStepIds.filter((stepId) => stepId === onlyStepId)
            : decision.runnableStepIds;

        for (const stepId of runnableStepIds) {
            const step = workflow.steps.find((candidate) => candidate.id === stepId);
            if (!step) continue;

            step.workflowId = workflow.id;
            step.status = "RUNNING";
            const result = await this.executor.execute(step);
            results[step.id] = result;
            if (result.executed) executedStepIds.push(step.id);

            if (result.success && result.executed && result.verified) {
                step.status = "COMPLETED";
                step.output = result.evidence ?? result.summary;
            } else if (result.executionStatus === "blocked") {
                step.status = "RUNNING";
                step.error = result.summary;
            } else {
                step.status = "FAILED";
                step.error = result.summary;
            }

            workflow.updatedAt = new Date();
            decision = this.engine.evaluate(workflow);
        }

        return {
            executedStepIds, results,
            runnableStepIds: decision.runnableStepIds,
            waitingStepIds: decision.waitingStepIds,
            blockedStepIds: decision.blockedStepIds,
            requiresApproval: decision.requiresApproval,
        };
    }
}
