import { AgentResult } from "../../shared/agents/interface";
import { runAgent } from "../../shared/agents/runner";
import { Priority } from "../task/priority";
import { WorkflowStep } from "./workflow-step";
import { WorkflowStepExecutor } from "./workflow-orchestrator";
import { ExecutionLedger, workflowStepIdempotencyKey } from "../execution/execution-ledger";

function toAgentPriority(priority: Priority): "low" | "medium" | "high" {
    switch (priority) {
        case Priority.LOW: return "low";
        case Priority.MEDIUM: return "medium";
        case Priority.HIGH:
        case Priority.CRITICAL: return "high";
    }
}

export class SharedAgentWorkflowExecutor implements WorkflowStepExecutor {
    constructor(private readonly ledger = new ExecutionLedger()) {}

    async execute(step: WorkflowStep): Promise<AgentResult> {
        const workflowId = step.workflowId;
        if (!workflowId) {
            throw new Error(`Workflow identity is required for step ${step.id}.`);
        }

        const idempotencyKey = workflowStepIdempotencyKey(workflowId, step.id);
        const claim = await this.ledger.begin(idempotencyKey, workflowId, step.id);

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

        const result = await runAgent(step.agentId, {
            id: step.id,
            title: step.title,
            description: step.description,
            priority: toAgentPriority(step.priority),
            metadata: {
                workflowStepId: step.id,
                workflowId,
                capability: step.capability,
                input: step.input,
                idempotencyKey,
            },
        });

        await this.ledger.complete(idempotencyKey, result);
        return result;
    }
}
