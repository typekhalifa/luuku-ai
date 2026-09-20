import crypto from "crypto";
import { Prisma } from "@prisma/client";

import { prisma } from "../database/client";
import {
    CommunicationService,
    ReceiveMessageInput,
    SendMessageInput,
} from "./communication-service";
import { CommunicationConversation } from "./conversation";
import { CommunicationMessage } from "./message";
import { ChannelIdentity } from "./channel";
import { CommunicationIdentityResolver } from "./identity-resolver";
import { CommunicationContext } from "./communication-service";
import { assertValidOwnership, ownershipPersistence, scopedThreadKey } from "./ownership";

function asChannelIdentity(value: unknown): ChannelIdentity {
    if (!value || typeof value !== "object") {
        return { channel: "internal" };
    }

    const record = value as Record<string, unknown>;
    return {
        channel: record.channel as ChannelIdentity["channel"],
        externalId:
            typeof record.externalId === "string"
                ? record.externalId
                : undefined,
        displayName:
            typeof record.displayName === "string"
                ? record.displayName
                : undefined,
    };
}

function asParticipants(value: unknown): ChannelIdentity[] {
    return Array.isArray(value)
        ? value.map(asChannelIdentity)
        : [];
}

function asMetadata(value: unknown): Record<string, unknown> | undefined {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return undefined;
    }

    return value as Record<string, unknown>;
}

function toInputJson(
    value?: Record<string, unknown>,
): Prisma.InputJsonValue | undefined {
    return value as Prisma.InputJsonValue | undefined;
}

function toChannelJson(value: ChannelIdentity): Prisma.InputJsonValue {
    return value as unknown as Prisma.InputJsonValue;
}

function toParticipantsJson(
    value: ChannelIdentity[],
): Prisma.InputJsonValue {
    return value as unknown as Prisma.InputJsonValue;
}

function mergeParticipants(
    existing: ChannelIdentity[],
    incoming: ChannelIdentity,
): ChannelIdentity[] {
    const key = `${incoming.channel}:${incoming.externalId ?? incoming.displayName ?? "unknown"}`;

    const merged = [...existing];
    const alreadyPresent = merged.some((participant) =>
        `${participant.channel}:${participant.externalId ?? participant.displayName ?? "unknown"}` === key,
    );

    if (!alreadyPresent) {
        merged.push(incoming);
    }

    return merged;
}

export class PrismaCommunicationService implements CommunicationService {
    private readonly identityResolver = new CommunicationIdentityResolver();

    async sendMessage(input: SendMessageInput): Promise<CommunicationMessage> {
        assertValidOwnership(input.context.ownership);

        const conversation = await this.getOrCreateConversation(
            input.conversationId,
            input.channel,
            input.recipient,
            input.context,
        );

        const externalMessageId =
            typeof input.metadata?.externalMessageId === "string"
                ? input.metadata.externalMessageId
                : undefined;

        const message = await prisma.communicationMessage.create({
            data: {
                conversationId: conversation.id,
                direction: "outbound",
                role: "agent",
                content: input.content,
                sender: toChannelJson({
                    channel: input.channel,
                    displayName: "Luuku AI",
                }),
                externalMessageId,
                metadata: toInputJson(input.metadata),
            },
        });

        const idempotencyKey =
            typeof input.metadata?.idempotencyKey === "string"
                ? input.metadata.idempotencyKey
                : undefined;

        if (idempotencyKey) {
            await prisma.communicationExecution.updateMany({
                where: {
                    idempotencyKey,
                    ...this.executionOwnershipWhere(input.context.ownership),
                },
                data: {
                    conversationId: conversation.id,
                },
            });
        }

        await prisma.communicationConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        return this.toDomainMessage(message);
    }

    async receiveMessage(
        input: ReceiveMessageInput,
    ): Promise<CommunicationMessage> {
        const conversation = await this.getOrCreateInboundConversation(input);

        const externalMessageId =
            typeof input.metadata?.externalMessageId === "string"
                ? input.metadata.externalMessageId
                : undefined;

        if (externalMessageId) {
            const existingMessage = await prisma.communicationMessage.findFirst({
                where: {
                    conversationId: conversation.id,
                    externalMessageId,
                },
            });

            if (existingMessage) {
                return this.toDomainMessage(existingMessage);
            }
        }

        const identityResolution = await this.identityResolver.resolve({
            context: input.context,
            channel: input.channel,
            externalId: input.sender.externalId,
            email: input.sender.channel === "email"
                ? input.sender.externalId
                : undefined,
            phoneNumber:
                input.sender.channel === "voice" || input.sender.channel === "whatsapp"
                    ? input.sender.externalId
                    : undefined,
            conversationId: conversation.id,
        });

        const enrichedMetadata: Record<string, unknown> = {
            ...(input.metadata ?? {}),
            identityResolution,
        };

        const message = await prisma.communicationMessage.create({
            data: {
                conversationId: conversation.id,
                direction: "inbound",
                role: input.sender.channel === "internal" ? "founder" : "system",
                content: input.content,
                sender: toChannelJson(input.sender),
                externalMessageId,
                metadata: toInputJson(enrichedMetadata),
            },
        });

        const existingConversationMetadata =
            asMetadata(conversation.metadata) ?? {};

        await prisma.communicationConversation.update({
            where: { id: conversation.id },
            data: {
                updatedAt: new Date(),
                metadata: toInputJson({
                    ...existingConversationMetadata,
                    identityResolution,
                }),
            },
        });

        return this.toDomainMessage(message);
    }

    async getConversation(
        conversationId: string,
        context: CommunicationContext,
    ): Promise<CommunicationConversation | null> {
        assertValidOwnership(context.ownership);

        const conversation = await prisma.communicationConversation.findFirst({
            where: {
                id: conversationId,
                ...this.ownershipWhere(context.ownership),
            },
            include: {
                messages: {
                    orderBy: { timestamp: "asc" },
                },
            },
        });

        if (!conversation) {
            return null;
        }

        return this.toDomainConversation(conversation);
    }

    async updateConversationMetadata(
        conversationId: string,
        patch: Record<string, unknown>,
        context: CommunicationContext,
    ): Promise<void> {
        assertValidOwnership(context.ownership);

        const conversation = await prisma.communicationConversation.findFirst({
            where: {
                id: conversationId,
                ...this.ownershipWhere(context.ownership),
            },
            select: { metadata: true },
        });

        if (!conversation) {
            throw new Error(`Communication conversation ${conversationId} could not be loaded.`);
        }

        const existingMetadata = asMetadata(conversation.metadata) ?? {};

        await prisma.communicationConversation.update({
            where: { id: conversationId },
            data: {
                metadata: toInputJson({
                    ...existingMetadata,
                    ...patch,
                }),
                updatedAt: new Date(),
            },
        });
    }

    private async getOrCreateInboundConversation(
        input: ReceiveMessageInput,
    ) {
        assertValidOwnership(input.context.ownership);

        if (input.conversationId) {
            const existingById = await prisma.communicationConversation.findUnique({
                where: { id: input.conversationId },
            });

            if (
                existingById &&
                !this.ownershipMatches(existingById, input.context.ownership)
            ) {
                throw new Error("COMMUNICATION_CONVERSATION_OWNERSHIP_MISMATCH");
            }

            const existing = existingById;

            if (existing) {
                const currentParticipants = asParticipants(existing.participants);
                const participants = mergeParticipants(
                    currentParticipants,
                    input.sender,
                );

                if (participants.length !== currentParticipants.length) {
                    return prisma.communicationConversation.update({
                        where: { id: existing.id },
                        data: {
                            participants: toParticipantsJson(participants),
                            updatedAt: new Date(),
                        },
                    });
                }

                return existing;
            }
        }

        if (input.externalConversationId) {
            const threadKey = scopedThreadKey(input.context.ownership, input.externalConversationId);
            const existing = await prisma.communicationConversation.findUnique({
                where: { threadKey },
            });

            if (existing) {
                const currentParticipants = asParticipants(existing.participants);
                const participants = mergeParticipants(
                    currentParticipants,
                    input.sender,
                );

                if (participants.length !== currentParticipants.length) {
                    return prisma.communicationConversation.update({
                        where: { id: existing.id },
                        data: {
                            participants: toParticipantsJson(participants),
                            updatedAt: new Date(),
                        },
                    });
                }

                return existing;
            }
        }

        const now = new Date();
        return prisma.communicationConversation.create({
            data: {
                id: crypto.randomUUID(),
                channel: input.channel,
                threadKey: input.externalConversationId
                    ? scopedThreadKey(input.context.ownership, input.externalConversationId)
                    : undefined,
                ...ownershipPersistence(input.context.ownership),
                participants: toParticipantsJson([input.sender]),
                metadata: toInputJson(input.metadata),
                createdAt: now,
                updatedAt: now,
            },
        });
    }

    private async getOrCreateConversation(
        conversationId: string,
        channel: SendMessageInput["channel"],
        participant: ChannelIdentity,
        context: CommunicationContext,
    ) {
        const existingById = await prisma.communicationConversation.findUnique({
            where: { id: conversationId },
        });

        if (
            existingById &&
            !this.ownershipMatches(existingById, context.ownership)
        ) {
            throw new Error("COMMUNICATION_CONVERSATION_OWNERSHIP_MISMATCH");
        }

        const existing = existingById;

        if (existing) {
            const currentParticipants = asParticipants(existing.participants);
            const participants = mergeParticipants(currentParticipants, participant);

            if (participants.length !== currentParticipants.length) {
                return prisma.communicationConversation.update({
                    where: { id: existing.id },
                    data: {
                        participants: toParticipantsJson(participants),
                        updatedAt: new Date(),
                    },
                });
            }

            return existing;
        }

        const now = new Date();
        return prisma.communicationConversation.create({
            data: {
                id: conversationId,
                channel,
                ...ownershipPersistence(context.ownership),
                participants: toParticipantsJson([participant]),
                createdAt: now,
                updatedAt: now,
            },
        });
    }


    private executionOwnershipWhere(
        ownership: CommunicationConversation["ownership"],
    ): Record<string, unknown> {
        switch (ownership.scope) {
            case "COMPANY":
                return { ownershipScope: "COMPANY", companyId: ownership.companyId };
            case "SPACE":
                return { ownershipScope: "SPACE", spaceId: ownership.spaceId };
            case "SYSTEM":
                return { ownershipScope: "SYSTEM", companyId: null, spaceId: null };
        }
    }

    private ownershipMatches(
        conversation: {
            ownershipScope: string | null;
            companyId: string | null;
            spaceId: string | null;
        },
        ownership: CommunicationConversation["ownership"],
    ): boolean {
        switch (ownership.scope) {
            case "COMPANY":
                return (
                    conversation.ownershipScope === "COMPANY" &&
                    conversation.companyId === ownership.companyId
                );
            case "SPACE":
                return (
                    conversation.ownershipScope === "SPACE" &&
                    conversation.spaceId === ownership.spaceId
                );
            case "SYSTEM":
                return (
                    conversation.ownershipScope === "SYSTEM" &&
                    !conversation.companyId &&
                    !conversation.spaceId
                );
        }
    }

    private ownershipWhere(
        ownership: CommunicationConversation["ownership"],
    ): Record<string, unknown> {
        assertValidOwnership(ownership);

        switch (ownership.scope) {
            case "COMPANY":
                return { ownershipScope: "COMPANY", companyId: ownership.companyId };
            case "SPACE":
                return { ownershipScope: "SPACE", spaceId: ownership.spaceId };
            case "SYSTEM":
                return { ownershipScope: "SYSTEM", companyId: null, spaceId: null };
        }
    }

    private toDomainMessage(
        message: {
            id: string;
            conversationId: string;
            direction: string;
            role: string;
            content: string;
            sender: Prisma.JsonValue;
            timestamp: Date;
            metadata: Prisma.JsonValue | null;
        },
    ): CommunicationMessage {
        return {
            id: message.id,
            conversationId: message.conversationId,
            direction: message.direction as CommunicationMessage["direction"],
            role: message.role as CommunicationMessage["role"],
            content: message.content,
            sender: asChannelIdentity(message.sender),
            timestamp: message.timestamp.toISOString(),
            metadata: asMetadata(message.metadata),
        };
    }

    private toDomainConversation(
        conversation: {
            id: string;
            channel: string;
            ownershipScope: string | null;
            companyId: string | null;
            spaceId: string | null;
            participants: Prisma.JsonValue;
            status: string;
            createdAt: Date;
            updatedAt: Date;
            metadata: Prisma.JsonValue | null;
            messages: Array<{
                id: string;
                conversationId: string;
                direction: string;
                role: string;
                content: string;
                sender: Prisma.JsonValue;
                timestamp: Date;
                metadata: Prisma.JsonValue | null;
            }>;
        },
    ): CommunicationConversation {
        const ownership =
            conversation.ownershipScope === "COMPANY" && conversation.companyId
                ? { scope: "COMPANY" as const, companyId: conversation.companyId }
                : conversation.ownershipScope === "SPACE" && conversation.spaceId
                    ? { scope: "SPACE" as const, spaceId: conversation.spaceId }
                    : conversation.ownershipScope === "SYSTEM" &&
                        !conversation.companyId &&
                        !conversation.spaceId
                        ? { scope: "SYSTEM" as const }
                        : null;

        if (!ownership) {
            throw new Error("COMMUNICATION_CONVERSATION_OWNERSHIP_UNRESOLVED");
        }

        return {
            id: conversation.id,
            channel: conversation.channel as CommunicationConversation["channel"],
            ownership,
            participants: asParticipants(conversation.participants),
            messages: conversation.messages.map((message) =>
                this.toDomainMessage(message),
            ),
            status: conversation.status as CommunicationConversation["status"],
            createdAt: conversation.createdAt.toISOString(),
            updatedAt: conversation.updatedAt.toISOString(),
            metadata: asMetadata(conversation.metadata),
        };
    }
}

export const prismaCommunicationService =
    new PrismaCommunicationService();
