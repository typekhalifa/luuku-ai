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

function metadataBoolean(
    request: CommunicationRequest,
    key: string,
): boolean | undefined {
    const value = request.metadata?.[key];
    return typeof value === "boolean" ? value : undefined;
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

export class CommunicationExecutionService {
    constructor(
        private readonly db: PrismaClient = prisma,
    ) {}

    async start(
        request: CommunicationRequest,
        policy: CommunicationPolicyResult,
    ): Promise<string> {
        const idempotencyKey =
            metadataString(request, "idempotencyKey") ||
            metadataString(request, "taskId");

        if (idempotencyKey) {
            const existing =
                await this.db.communicationExecution.findUnique({
                    where: { idempotencyKey },
                });

            if (existing) {
                return existing.id;
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

        return record.id;
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

    async findByIdempotencyKey(
        idempotencyKey: string,
    ) {
        return this.db.communicationExecution.findUnique({
            where: { idempotencyKey },
        });
    }
}

export const communicationExecutionService =
    new CommunicationExecutionService();
