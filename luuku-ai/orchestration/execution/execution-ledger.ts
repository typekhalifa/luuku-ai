import { prisma } from "../../shared/database/client.js";
import { AgentResult } from "../../shared/agents/interface";

export interface ExecutionClaim {
    id: string;
    idempotencyKey: string;
    status: "executing" | "completed";
    result?: AgentResult;
}

/** Durable V6.4 execution ledger. */
export class ExecutionLedger {
    async begin(idempotencyKey: string, workflowId: string, stepId: string): Promise<ExecutionClaim> {
        const existing = await prisma.communicationExecution.findUnique({ where: { idempotencyKey } });
        if (existing) {
            return {
                id: existing.id,
                idempotencyKey,
                status: existing.executed ? "completed" : "executing",
                result: existing.executed ? {
                    success: existing.verified,
                    summary: "Recovered durable execution result.",
                    completedAt: existing.updatedAt.toISOString(),
                    executionStatus: existing.status as AgentResult["executionStatus"],
                    executed: existing.executed,
                    verified: existing.verified,
                    evidence: existing.evidence as AgentResult["evidence"],
                } : undefined,
            };
        }

        const record = await prisma.communicationExecution.create({
            data: {
                taskId: stepId,
                idempotencyKey,
                capability: "workflow.step",
                channel: "internal",
                policyDecision: "allowed",
                policyReason: "V6.4 durable execution ledger",
                status: "executing",
                recipient: { workflowId, stepId },
            },
        });
        return { id: record.id, idempotencyKey, status: "executing" };
    }

    async complete(idempotencyKey: string, result: AgentResult): Promise<void> {
        await prisma.communicationExecution.update({
            where: { idempotencyKey },
            data: {
                status: result.executionStatus ?? (result.success ? "completed" : "failed"),
                executed: result.executed ?? false,
                verified: result.verified ?? false,
                provider: result.evidence?.provider,
                externalId: result.evidence?.externalId,
                evidence: result.evidence ? JSON.parse(JSON.stringify(result.evidence)) : null,
                error: result.success ? null : result.summary,
            },
        });
    }
}

export function workflowStepIdempotencyKey(workflowId: string, stepId: string): string {
    return `luuku:v6:workflow:${workflowId}:step:${stepId}`;
}
