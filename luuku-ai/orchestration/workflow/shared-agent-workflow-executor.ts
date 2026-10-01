import { AgentResult } from "../../shared/agents/interface";
import { WorkflowStep } from "./workflow-step";
import { WorkflowStepExecutor } from "./workflow-orchestrator";
import { ExecutionLedger, workflowStepIdempotencyKey } from "../execution/execution-ledger";
import { createDefaultProductionActuatorComposition } from "../execution/default-production-actuators.js";
import type { ExecutionOwnership } from "../ownership.js";

export class SharedAgentWorkflowExecutor implements WorkflowStepExecutor {
    constructor(
        private readonly ledger = new ExecutionLedger(),
        private readonly actuators = createDefaultProductionActuatorComposition(),
    ) {}

    async execute(step: WorkflowStep): Promise<AgentResult> {
        const workflowId = step.workflowId;
        if (!workflowId) {
            throw new Error(`Workflow identity is required for step ${step.id}.`);
        }

        const ownership: ExecutionOwnership | undefined = step.ownership;
        if (!ownership) {
            throw new Error(`Workflow ownership is required for step ${step.id}.`);
        }

        const idempotencyKey = workflowStepIdempotencyKey(workflowId, step.id);
        const claim = await this.ledger.begin(
            idempotencyKey,
            workflowId,
            step.id,
            ownership,
        );

        // An existing executing record is an uncertain outcome after a crash.
        // Never blindly dispatch the side effect a second time; reconciliation
        // must happen at the provider boundary before execution resumes.
        if (claim.status === "executing" && claim.result === undefined) {
            return {
                success: false,
                summary: "Execution is already recorded as executing. Reconciliation is required before retrying.",
                completedAt: new Date().toISOString(),
                executionStatus: "blocked",
                executed: false,
                verified: false,
                blockers: ["Durable idempotency ledger contains an unresolved execution."]
            };
        }

        if (claim.status === "completed" && claim.result) return claim.result;

        const result = await this.actuators.dispatch({
            ...step,
            workflowId,
        });

        const agentResult = result.result ?? {
            success: false,
            summary: result.reason ?? "Production actuator blocked execution.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false,
            blockers: [result.reason ?? "PRODUCTION_ACTUATOR_BLOCKED"],
        };

        await this.ledger.complete(idempotencyKey, agentResult);
        return agentResult;
    }
}
