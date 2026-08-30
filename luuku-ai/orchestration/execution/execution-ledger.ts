import { prisma } from "../../shared/database/client";
import { AgentResult } from "../../shared/agents/interface";

export interface ExecutionClaim {
    id: string;
    idempotencyKey: string;
    status: "executing" | "completed";
    result?: AgentResult;
}

/**
 * Durable execution ledger for V6.4.
 *
 * The ledger gives every workflow step execution a stable idempotency key.
 * A future provider adapter can use the same key at its external side-effect
 * boundary. The in-memory runner guard remains useful for concurrency, but
 * this ledger survives process restarts.
 */
export class ExecutionLedger {
    async begin(idempotencyKey: string, workflowId: string, stepId: string): Promise<ExecutionClaim> {
        const existing = await prisma.communicationExecution.findUnique({
            where: { idempotencyKey },
        });

        if (existing) {
            return {
                id: existing.id,
                idempotencyKey,
                status: existing.executed ? "completed" : "executing",
                result: existing.evidence ? {
                    success: existing.executed && existing.verified,
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
                conversationId: null,
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
                evidence: result.evidence,
                error: result.success ? null : result.summary,
            },
        });
    }
}

export function workflowStepIdempotencyKey(workflowId: string, stepId: string): string {
    return `luuku:v6:workflow:${workflowId}:step:${stepId}`;
}
