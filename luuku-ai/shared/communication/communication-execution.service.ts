import { Prisma, PrismaClient } from "@prisma/client";

import { prisma } from "../database/client";
import { CommunicationPolicyResult } from "./communication-policy";
import {
    CommunicationExecutionResult,
    CommunicationRequest,
} from "./types";

function metadataString(
    request: CommunicationRequest,
    key: string,
): string | undefined {
    const value = request.metadata?.[key];
    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
}

function jsonValue(value: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function requestRecipient(
    request: CommunicationRequest,
): Prisma.InputJsonValue | undefined {
    const externalId =
        request.recipientExternalId ||
        request.recipient;

    if (!externalId) {
        return undefined;
    }

    return {
        channel: request.channel,
        externalId,
    };
}

function isTerminalStatus(
    status: string,
): boolean {
    return [
        "blocked",
        "failed",
        "completed",
        "verified",
    ].includes(status);
}

function isSafeToRetry(existing: {
    status: string;
    executed: boolean;
    verified: boolean;
}): boolean {
    // A request that never executed externally may be safely re-evaluated.
    // Once anything external has executed or been verified, idempotency wins.
    return !existing.executed && !existing.verified;
}

export interface CommunicationExecutionHandle {
    id: string;
    reused: boolean;
    existingResult?: CommunicationExecutionResult;
}

export class CommunicationExecutionService {
    constructor(
        private readonly db: PrismaClient = prisma,
    ) {}

    async start(
        request: CommunicationRequest,
        policy: CommunicationPolicyResult,
    ): Promise<CommunicationExecutionHandle> {
        const idempotencyKey =
            metadataString(request, "idempotencyKey");

        if (idempotencyKey) {
            const existing =
                await this.db.communicationExecution.findUnique({
                    where: { idempotencyKey },
                });

            if (existing && !isSafeToRetry(existing)) {
                return {
                    id: existing.id,
                    reused: true,
                    existingResult:
                        isTerminalStatus(existing.status)
                            ? {
                                  capability:
                                      existing.capability as CommunicationExecutionResult["capability"],
                                  channel:
                                      existing.channel as CommunicationExecutionResult["channel"],
                                  status:
                                      existing.status as CommunicationExecutionResult["status"],
                                  executed: existing.executed,
                                  verified: existing.verified,
                                  evidence:
                                      existing.evidence
                                          ? (existing.evidence as unknown as CommunicationExecutionResult["evidence"])
                                          : undefined,
                                  summary:
                                      existing.policyReason,
                                  error: existing.error ?? undefined,
                              }
                            : undefined,
                };
            }

            if (existing && isSafeToRetry(existing)) {
                await this.db.communicationExecution.update({
                    where: { id: existing.id },
                    data: {
                        policyDecision: policy.decision,
                        policyReason: policy.reason,
                        executionMode:
                            metadataString(request, "executionMode"),
                        recipient: requestRecipient(request),
                        audience:
                            metadataString(request, "audience"),
                        evidence: policy.identityResolution
                            ? jsonValue({
                                  identityResolution:
                                      policy.identityResolution,
                              })
                            : undefined,
                        status: "planned",
                        error: null,
                    },
                });

                return {
                    id: existing.id,
                    reused: false,
                };
            }
        }

        const record =
            await this.db.communicationExecution.create({
                data: {
                    conversationId:
                        metadataString(request, "conversationId"),
                    taskId:
                        metadataString(request, "taskId"),
                    idempotencyKey,
                    capability: request.capability,
                    channel: request.channel,
                    recipient: requestRecipient(request),
                    audience:
                        metadataString(request, "audience"),
                    executionMode:
                        metadataString(request, "executionMode"),
                    policyDecision: policy.decision,
                    policyReason: policy.reason,
                    status: "planned",
                    executed: false,
                    verified: false,
                    evidence: policy.identityResolution
                        ? jsonValue({
                              identityResolution:
                                  policy.identityResolution,
                          })
                        : undefined,
                },
            });

        return {
            id: record.id,
            reused: false,
        };
    }

    async attachConversationByIdempotencyKey(
        idempotencyKey: string,
        conversationId: string,
    ): Promise<void> {
        await this.db.communicationExecution.updateMany({
            where: { idempotencyKey },
            data: {
                conversationId,
            },
        });
    }

    async markExecuting(
        executionId: string,
    ): Promise<void> {
        await this.db.communicationExecution.update({
            where: { id: executionId },
            data: {
                status: "executing",
            },
        });
    }

    async complete(
        executionId: string,
        result: CommunicationExecutionResult,
    ): Promise<void> {
        await this.db.communicationExecution.update({
            where: { id: executionId },
            data: {
                status: result.status,
                executed: result.executed,
                verified: result.verified,
                provider: result.evidence?.provider,
                externalId: result.evidence?.externalId,
                evidence: result.evidence
                    ? jsonValue(result.evidence)
                    : undefined,
                error: result.error,
            },
        });
    }
}

export const communicationExecutionService =
    new CommunicationExecutionService();
