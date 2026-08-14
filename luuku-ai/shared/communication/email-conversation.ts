import { Prisma } from "@prisma/client";

import { prisma } from "../database/client";

function normalizeEmail(value: string): string {
    return value.trim().toLowerCase();
}

export function normalizeEmailSubject(value: string): string {
    return value
        .replace(/^(?:(?:re|fw|fwd)\s*:\s*)+/i, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
}

export function buildEmailThreadKey(
    participantEmail: string,
    subject: string,
): string {
    return `email:${normalizeEmail(participantEmail)}:${normalizeEmailSubject(subject) || "no-subject"}`;
}

export async function getOrCreateEmailConversation(input: {
    participantEmail: string;
    subject: string;
    metadata?: Record<string, unknown>;
}): Promise<{ id: string; threadKey: string }> {
    const threadKey = buildEmailThreadKey(
        input.participantEmail,
        input.subject,
    );

    const existing = await prisma.communicationConversation.findUnique({
        where: { threadKey },
    });

    if (existing) {
        return {
            id: existing.id,
            threadKey,
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
                        displayName: normalizeEmail(input.participantEmail),
                    },
                    {
                        channel: "email",
                        displayName: "Luuku AI",
                    },
                ],
                metadata: (input.metadata || undefined) as
                    | Prisma.InputJsonValue
                    | undefined,
            },
        });

        return {
            id: created.id,
            threadKey,
        };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            const raced = await prisma.communicationConversation.findUnique({
                where: { threadKey },
            });

            if (raced) {
                return {
                    id: raced.id,
                    threadKey,
                };
            }
        }

        throw error;
    }
}
