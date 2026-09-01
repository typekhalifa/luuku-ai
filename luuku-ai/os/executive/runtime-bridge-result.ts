import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";

export type ExecutionBridgeStatus = "SUBMITTED" | "BLOCKED" | "NOT_EXECUTABLE";

export interface ExecutionBridgeResult {
    readonly status: ExecutionBridgeStatus;
    readonly reason: string;
    readonly workflow?: Workflow;
    readonly planId: string;
}

export function isExecutable(result: ExecutionBridgeResult): result is ExecutionBridgeResult & { workflow: Workflow } {
    return result.status === "SUBMITTED" && result.workflow !== undefined;
}

export function assertPlanIdentity(result: ExecutionBridgeResult, plan: ExecutionPlan): void {
    if (result.planId !== plan.id) {
        throw new Error(`Execution bridge identity mismatch: expected ${plan.id}, received ${result.planId}.`);
    }
}
