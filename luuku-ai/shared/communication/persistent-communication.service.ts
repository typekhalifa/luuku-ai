import { Prisma } from "@prisma/client";
import { prisma } from "../database/client";

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

function normalizeSubject(value: string): string {
    return value
        .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

function buildEmailThreadKey(
    participantEmail: string,
    subject: string
): string {
    return `email:${normalizeEmail(participantEmail)}:${normalizeSubject(subject) || "no-subject"}`;
}

export async function getOrCreateEmailConversation(input: {
    participantEmail: string;
    subject: string;
    metadata?: Record<string, unknown>;
}): Promise<{ id: string; threadKey: string }> {
    const threadKey = buildEmailThreadKey(
        input.participantEmail,
        input.subject
    );

    const existing = await prisma.communicationConversation.findUnique({
        where: { threadKey }
    });

    if (existing) {
        return {
            id: existing.id,
            threadKey
        };
    }

    try {
        const created = await prisma.communicationConversation.create({
            data: {
                channel: "email",
                threadKey,
                participants: [
                    {
                        channel: "email",
                        externalId: normalizeEmail(input.participantEmail),
                        displayName: normalizeEmail(input.participantEmail)
                    },
                    {
                        channel: "email",
                        displayName: "Luuku AI"
                    }
                ],
                metadata: (input.metadata || undefined) as Prisma.InputJsonValue | undefined
            }
        });

        return {
            id: created.id,
            threadKey
        };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const raced = await prisma.communicationConversation.findUnique({
                where: { threadKey }
            });

            if (raced) {
                return {
                    id: raced.id,
                    threadKey
                };
            }
        }

        throw error;
    }
}

export async function appendCommunicationMessage(input: {
    conversationId: string;
    direction: "inbound" | "outbound";
    role: "founder" | "agent" | "system";
    content: string;
    sender: Record<string, unknown>;
    externalMessageId?: string;
    metadata?: Record<string, unknown>;
}): Promise<string> {
    const message = await prisma.communicationMessage.create({
        data: {
            conversationId: input.conversationId,
            direction: input.direction,
            role: input.role,
            content: input.content,
            sender: input.sender as Prisma.InputJsonValue,
            externalMessageId: input.externalMessageId,
            metadata: (input.metadata || undefined) as Prisma.InputJsonValue | undefined
        }
    });

    await prisma.communicationConversation.update({
        where: {
            id: input.conversationId
        },
        data: {
            updatedAt: new Date()
        }
    });

    return message.id;
}

export async function linkCommunicationEventToConversation(
    providerEventId: string,
    conversationId: string
): Promise<void> {
    await prisma.communicationEvent.updateMany({
        where: {
            providerEventId
        },
        data: {
            conversationId
        }
    });
}

export async function getConversationById(
    conversationId: string
) {
    return prisma.communicationConversation.findUnique({
        where: {
            id: conversationId
        },
        include: {
            messages: {
                orderBy: {
                    timestamp: "asc"
                }
            },
            events: {
                orderBy: {
                    receivedAt: "asc"
                }
            }
        }
    });
}
