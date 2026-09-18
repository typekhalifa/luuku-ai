import type { AgentResult } from "../../shared/agents/interface.js";
import type { WorkflowStep } from "../workflow/workflow-step.js";

export type V6ActuationBoundary = "V6_EXECUTION_AUTHORITY";

export interface V6ActuationContext {
    readonly workflowId: string;
    readonly stepId: string;
    readonly capability?: string;
}

export interface V6ActuationResult {
    readonly allowed: boolean;
    readonly boundary: V6ActuationBoundary;
    readonly context: V6ActuationContext;
    readonly result?: AgentResult;
    readonly reason?: string;
}

/**
 * Final dispatch boundary for real-world work.
 *
 * V8 may select, prioritize, plan, learn, and intervene, but only a V6
 * workflow step may cross this boundary. This class does not grant approval;
 * it validates execution identity and delegates the already-authorized step
 * to the supplied V6 executor.
 */
export class V6ActuationBoundaryEngine {
    async dispatch(
        step: WorkflowStep,
        executor: (step: WorkflowStep) => Promise<AgentResult>,
    ): Promise<V6ActuationResult> {
        const validation = this.validate(step);
        const context: V6ActuationContext = {
            workflowId: step.workflowId ?? "",
            stepId: step.id,
            capability: step.capability,
        };

        if (validation) {
            return {
                allowed: false,
                boundary: "V6_EXECUTION_AUTHORITY",
                context,
                reason: validation,
            };
        }

        const result = await executor(step);
        return {
            allowed: true,
            boundary: "V6_EXECUTION_AUTHORITY",
            context,
            result,
        };
    }

    private validate(step: WorkflowStep): string | undefined {
        if (!step.workflowId?.trim()) {
            return "V6 actuation requires a durable workflow identity.";
        }

        if (!step.id.trim()) {
            return "V6 actuation requires a workflow step identity.";
        }

        if (!step.agentId.trim()) {
            return "V6 actuation requires an authorized agent identity.";
        }

        if (!step.capability?.trim()) {
            return "V6 actuation requires an explicit capability.";
        }

        if (step.requiresApproval) {
            return "V6 actuation cannot bypass a workflow step approval requirement.";
        }

        if (step.status !== "READY" && step.status !== "RUNNING") {
            return `V6 actuation requires a READY or RUNNING step; received ${step.status}.`;
        }

        return undefined;
    }
}
