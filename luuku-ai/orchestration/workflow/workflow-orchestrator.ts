import { AgentTask, AgentResult } from "../../shared/agents/interface";
import { Workflow, WorkflowStep } from "./workflow";
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

/**
 * V6 boundary between workflow coordination and real agent execution.
 * The orchestrator decides what is runnable; an injected executor decides how
 * that step is actually executed. No provider-specific logic belongs here.
 */
export class WorkflowOrchestrator {
    constructor(
        private readonly engine = new WorkflowEngine(),
        private readonly executor?: WorkflowStepExecutor,
    ) {}

    async runReadySteps(workflow: Workflow): Promise<WorkflowOrchestrationResult> {
        const executedStepIds: string[] = [];
        const results: Record<string, AgentResult> = {};

        if (!this.executor) {
            const decision = this.engine.evaluate(workflow);
            return {
                executedStepIds,
                results,
                runnableStepIds: decision.runnableStepIds,
                waitingStepIds: decision.waitingStepIds,
                blockedStepIds: decision.blockedStepIds,
                requiresApproval: decision.requiresApproval,
            };
        }

        let decision = this.engine.evaluate(workflow);

        for (const stepId of decision.runnableStepIds) {
            const step = workflow.steps.find((candidate) => candidate.id === stepId);
            if (!step) continue;

            const task: AgentTask = {
                id: step.id,
                title: step.title,
                description: step.description,
                priority: step.priority,
                metadata: {
                    workflowId: workflow.id,
                    stepId: step.id,
                    agentId: step.agentId,
                    capability: step.capability,
                    ...(step.input ? { input: step.input } : {}),
                },
            };

            // The executor receives the workflow step as the source of truth.
            // The task shape above is intentionally prepared here for the next
            // integration with the existing agent/runtime boundary.
            void task;

            step.status = "RUNNING";
            const result = await this.executor.execute(step);
            results[step.id] = result;
            executedStepIds.push(step.id);

            if (result.success && result.executed && result.verified) {
                step.status = "COMPLETED";
                step.output = result.evidence ?? result.summary;
            } else {
                step.status = "FAILED";
                step.error = result.summary;
            }

            workflow.updatedAt = new Date();
            decision = this.engine.evaluate(workflow);
        }

        return {
            executedStepIds,
            results,
            runnableStepIds: decision.runnableStepIds,
            waitingStepIds: decision.waitingStepIds,
            blockedStepIds: decision.blockedStepIds,
            requiresApproval: decision.requiresApproval,
        };
    }
}
