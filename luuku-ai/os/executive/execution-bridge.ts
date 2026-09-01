import type { ExecutionDecision } from "./execution-decision.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";
import type { WorkflowStep } from "../../orchestration/workflow/workflow-step.js";
import type { ExecutionBridgeResult } from "./runtime-bridge-result.js";
import { Priority } from "../../orchestration/task/priority.js";
import { WorkflowStatus } from "../../orchestration/workflow/workflow-status.js";

/** Converts an execution decision into a V6 workflow without invoking the runtime. */
export class ExecutiveExecutionBridge {
    submit(decision: ExecutionDecision, plan: ExecutionPlan): ExecutionBridgeResult {
        if (decision.planId !== plan.id) {
            throw new Error(`Execution bridge identity mismatch: decision ${decision.planId} does not match plan ${plan.id}.`);
        }

        if (decision.status === "NOT_EXECUTABLE") {
            return { status: "NOT_EXECUTABLE", planId: plan.id, reason: "Execution decision is not executable." };
        }

        if (decision.status === "BLOCKED") {
            return { status: "BLOCKED", planId: plan.id, reason: "Execution decision is blocked pending founder approval." };
        }

        const now = new Date();
        const steps: WorkflowStep[] = plan.steps.map((step) => ({
            id: step.taskId,
            workflowId: plan.id,
            title: plan.goal,
            description: plan.goal,
            agentId: step.agentId,
            capability: step.capability,
            dependsOn: [...step.dependsOn],
            priority: Priority.MEDIUM,
            requiresApproval: false,
            status: "READY",
            input: step.input,
        }));

        const workflow: Workflow = {
            id: plan.id,
            goal: plan.goal,
            status: WorkflowStatus.READY,
            steps,
            requiresFounderApproval: false,
            createdAt: now,
            updatedAt: now,
            metadata: {
                source: "executive-execution-bridge",
                executionDecisionId: decision.id,
                executionDecisionStatus: decision.status,
                sourcePlanId: plan.sourcePlanId,
            },
        };

        return {
            status: "SUBMITTED",
            workflow,
            planId: plan.id,
            reason: "Execution-eligible work was converted into a V6 workflow for orchestration.",
        };
    }
}
