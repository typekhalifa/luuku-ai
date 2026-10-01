import type { ExecutionDecision } from "./execution-decision.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import { ExecutiveExecutionBridge } from "./execution-bridge.js";
import type { ExecutionBridgeResult } from "./runtime-bridge-result.js";
import type { Workflow } from "../../orchestration/workflow/workflow.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";

export type ExecutiveSubmissionStatus = "SUBMITTED" | "ALREADY_SUBMITTED" | "BLOCKED" | "NOT_EXECUTABLE";

export interface ExecutiveSubmissionResult {
    readonly status: ExecutiveSubmissionStatus;
    readonly workflow?: Workflow;
    readonly planId: string;
    readonly reason: string;
}

/** Durable executive submission boundary. Persists only execution-eligible work and never executes it. */
export class DurableExecutiveSubmission {
    constructor(
        private readonly workflowStore: WorkflowStore,
        private readonly bridge = new ExecutiveExecutionBridge(),
    ) {}

    async submit(decision: ExecutionDecision, plan: ExecutionPlan): Promise<ExecutiveSubmissionResult> {
        const existing = await this.workflowStore.get(plan.id);
        if (existing) {
            return {
                status: "ALREADY_SUBMITTED",
                workflow: existing,
                planId: plan.id,
                reason: "Execution plan has already been durably submitted.",
            };
        }

        const bridged: ExecutionBridgeResult = this.bridge.submit(decision, plan);
        if (bridged.status !== "SUBMITTED" || !bridged.workflow) {
            return {
                status: bridged.status,
                planId: plan.id,
                reason: bridged.reason,
            };
        }

        const persisted = await this.workflowStore.create(bridged.workflow);
        return {
            status: "SUBMITTED",
            workflow: persisted,
            planId: plan.id,
            reason: "Execution-eligible workflow was durably submitted for V6 orchestration.",
        };
    }
}
