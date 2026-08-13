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
    async sendMessage(input: SendMessageInput): Promise<CommunicationMessage> {
        const conversation = await this.getOrCreateConversation(
            input.conversationId,
            input.channel,
            input.recipient,
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

        const message = await prisma.communicationMessage.create({
            data: {
                conversationId: conversation.id,
                direction: "inbound",
                role: input.sender.channel === "internal" ? "founder" : "system",
                content: input.content,
                sender: toChannelJson(input.sender),
                externalMessageId,
                metadata: toInputJson(input.metadata),
            },
        });

        await prisma.communicationConversation.update({
            where: { id: conversation.id },
            data: { updatedAt: new Date() },
        });

        return this.toDomainMessage(message);
    }

    async getConversation(
        conversationId: string,
    ): Promise<CommunicationConversation | null> {
        const conversation = await prisma.communicationConversation.findUnique({
            where: { id: conversationId },
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

    private async getOrCreateInboundConversation(
        input: ReceiveMessageInput,
    ) {
        if (input.conversationId) {
            const existing = await prisma.communicationConversation.findUnique({
                where: { id: input.conversationId },
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

        if (input.externalConversationId) {
            const existing = await prisma.communicationConversation.findUnique({
                where: { threadKey: input.externalConversationId },
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
                threadKey: input.externalConversationId,
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
    ) {
        const existing = await prisma.communicationConversation.findUnique({
            where: { id: conversationId },
        });

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
                participants: toParticipantsJson([participant]),
                createdAt: now,
                updatedAt: now,
            },
        });
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
        return {
            id: conversation.id,
            channel: conversation.channel as CommunicationConversation["channel"],
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
