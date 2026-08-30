import { WorkflowStatus } from "./workflow-status";
import { Workflow } from "./workflow";
import { WorkflowStep } from "./workflow-step";

export interface WorkflowDecision {
    workflowId: string;
    runnableStepIds: string[];
    waitingStepIds: string[];
    blockedStepIds: string[];
    requiresApproval: boolean;
}

/**
 * Pure V6 workflow coordination primitives.
 *
 * The engine decides what is allowed to run; it does not execute agents,
 * call providers, or persist state. Those responsibilities remain in the
 * orchestration/runtime layers.
 */
export class WorkflowEngine {
    evaluate(workflow: Workflow): WorkflowDecision {
        const completed = new Set(
            workflow.steps
                .filter((step) => step.status === "COMPLETED")
                .map((step) => step.id),
        );

        const runnableStepIds: string[] = [];
        const waitingStepIds: string[] = [];
        const blockedStepIds: string[] = [];
        const workflowCanRun =
            workflow.status === WorkflowStatus.READY ||
            workflow.status === WorkflowStatus.RUNNING;

        for (const step of workflow.steps) {
            if (step.status === "COMPLETED" || step.status === "CANCELLED") {
                continue;
            }

            if (step.status === "FAILED") {
                blockedStepIds.push(step.id);
                continue;
            }

            const dependenciesSatisfied = step.dependsOn.every((id) => completed.has(id));

            if (!dependenciesSatisfied) {
                waitingStepIds.push(step.id);
                continue;
            }

            if (!workflowCanRun) {
                blockedStepIds.push(step.id);
                continue;
            }

            runnableStepIds.push(step.id);
        }

        return {
            workflowId: workflow.id,
            runnableStepIds,
            waitingStepIds,
            blockedStepIds,
            requiresApproval:
                workflow.requiresFounderApproval &&
                workflow.status === WorkflowStatus.AWAITING_APPROVAL,
        };
    }

    static allStepsCompleted(steps: WorkflowStep[]): boolean {
        return steps.length > 0 && steps.every((step) => step.status === "COMPLETED");
    }
}
