import { Prisma } from "@prisma/client";

import { prisma } from "../database/client";
import { handleInboundSalesReply } from "./inbound-sales.service";
import {
    appendCommunicationMessage,
    getOrCreateEmailConversation
} from "./persistent-communication.service";

const RESEND_RECEIVING_ENDPOINT =
    "https://api.resend.com/emails/receiving";

type ResendInboundEvent = {
    type?: string;
    created_at?: string;
    data?: {
        email_id?: string;
        message_id?: string;
        from?: string;
        to?: string[];
        subject?: string;
        attachments?: unknown[];
        [key: string]: unknown;
    };
};

type ReceivedEmail = {
    id: string;
    to?: string[];
    from?: string;
    subject?: string;
    html?: string | null;
    text?: string | null;
    headers?: Record<string, unknown>;
    message_id?: string;
    attachments?: unknown[];
    [key: string]: unknown;
};

function extractEmailAddress(value?: string): string | undefined {
    if (!value) {
        return undefined;
    }

    const angleMatch = value.match(/<([^>]+)>/);
    const candidate = angleMatch?.[1] || value;
    const emailMatch = candidate.match(
        /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i
    );

    return emailMatch?.[0]?.toLowerCase();
}

function getHeader(
    headers: Record<string, unknown> | undefined,
    name: string
): string | undefined {
    if (!headers) {
        return undefined;
    }

    const target = name.toLowerCase();

    const entry = Object.entries(headers).find(
        ([key]) => key.toLowerCase() === target
    )?.[1];

    if (typeof entry === "string") {
        return entry;
    }

    if (Array.isArray(entry)) {
        return entry
            .filter((value) => typeof value === "string")
            .join(" ");
    }

    return undefined;
}

function extractMessageIds(value?: string): string[] {
    if (!value) {
        return [];
    }

    const matches = value.match(/<[^>]+>/g);

    return matches?.length
        ? matches
        : [value.trim()];
}

async function retrieveReceivedEmail(
    emailId: string
): Promise<ReceivedEmail> {
    const apiKey = process.env.RESEND_API_KEY;

    if (!apiKey) {
        throw new Error("RESEND_API_KEY_NOT_CONFIGURED");
    }

    const response = await fetch(
        `${RESEND_RECEIVING_ENDPOINT}/${encodeURIComponent(emailId)}`,
        {
            headers: {
                Authorization: `Bearer ${apiKey}`
            }
        }
    );

    const payload = await response.json() as
        | ReceivedEmail
        | {
            message?: string;
            name?: string;
        };

    if (!response.ok || !("id" in payload)) {
        const errorPayload = payload as {
            message?: string;
            name?: string;
        };

        throw new Error(
            errorPayload.message ||
            errorPayload.name ||
            `RESEND_RECEIVING_HTTP_${response.status}`
        );
    }

    return payload;
}

export async function processInboundResendEmail(
    event: ResendInboundEvent,
    providerEventId: string
): Promise<{
    duplicate: boolean;
    activityId?: string;
    contactId?: string;
    dealId?: string;
    conversationId?: string;
    emailId: string;
}> {
    const data = event.data || {};
    const emailId = data.email_id;

    if (!emailId) {
        throw new Error("RESEND_RECEIVED_EMAIL_ID_MISSING");
    }

    const receivedEmail = await retrieveReceivedEmail(emailId);

    const senderEmail = extractEmailAddress(
        receivedEmail.from || data.from
    );

    const messageId =
        receivedEmail.message_id || data.message_id;

    const inReplyTo = getHeader(
        receivedEmail.headers,
        "in-reply-to"
    );

    const references = getHeader(
        receivedEmail.headers,
        "references"
    );

    const threadMessageIds = [
        ...extractMessageIds(inReplyTo),
        ...extractMessageIds(references)
    ];

    const subject =
        receivedEmail.subject ||
        data.subject ||
        "No subject";

    const existingContact = senderEmail
        ? await prisma.contact.findFirst({
            where: {
                email: {
                    equals: senderEmail,
                    mode: "insensitive"
                }
            },
            include: {
                company: true
            }
        })
        : null;

    let threadEvent = null as Awaited<
        ReturnType<typeof prisma.communicationEvent.findFirst>
    >;

    if (threadMessageIds.length) {
        threadEvent = await prisma.communicationEvent.findFirst({
            where: {
                messageId: {
                    in: threadMessageIds
                }
            },
            orderBy: {
                receivedAt: "desc"
            }
        });
    }

    const fallbackContact =
        existingContact ||
        (threadEvent?.recipient
            ? await prisma.contact.findFirst({
                where: {
                    email: {
                        equals: threadEvent.recipient,
                        mode: "insensitive"
                    }
                },
                include: {
                    company: true
                }
            })
            : null);

    const companyId = fallbackContact?.companyId;

    const deal = companyId
        ? await prisma.deal.findFirst({
            where: {
                companyId,
                stage: {
                    notIn: ["won", "lost"]
                }
            },
            orderBy: {
                updatedAt: "desc"
            }
        })
        : null;

    const participantEmail =
        senderEmail ||
        fallbackContact?.email ||
        threadEvent?.sender ||
        "unknown@example.invalid";

    const conversation =
        threadEvent?.conversationId
            ? {
                id: threadEvent.conversationId,
                threadKey: undefined
            }
            : await getOrCreateEmailConversation({
                participantEmail,
                subject,
                metadata: {
                    source: "resend-inbound",
                    providerEventId,
                    emailId
                }
            });

    const storedPayload = {
        webhook: event,
        receivedEmail: {
            ...receivedEmail,
            html: receivedEmail.html || undefined,
            text: receivedEmail.text || undefined
        },
        correlation: {
            senderEmail,
            messageId,
            inReplyTo,
            references,
            matchedThreadMessageIds: threadMessageIds,
            matchedContactId: fallbackContact?.id,
            matchedCompanyId: companyId,
            matchedDealId: deal?.id,
            conversationId: conversation.id
        }
    } as unknown as Prisma.InputJsonValue;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const communicationEvent =
                await tx.communicationEvent.create({
                    data: {
                        provider: "resend",
                        providerEventId,
                        type: event.type || "email.received",
                        externalId: emailId,
                        messageId,
                        conversationId: conversation.id,
                        recipient: Array.isArray(receivedEmail.to)
                            ? receivedEmail.to[0]
                            : data.to?.[0],
                        sender: receivedEmail.from || data.from,
                        subject,
                        payload: storedPayload
                    }
                });

            if (!fallbackContact || !companyId) {
                return {
                    communicationEventId: communicationEvent.id,
                    activityId: undefined,
                    contactId: undefined,
                    dealId: undefined
                };
            }

            const body =
                receivedEmail.text?.trim() ||
                receivedEmail.html?.trim() ||
                "Inbound email received without a text body.";

            const activity = await tx.activity.create({
                data: {
                    companyId,
                    contactId: fallbackContact.id,
                    dealId: deal?.id,
                    type: "email",
                    title: `Inbound email: ${subject}`,
                    description: body,
                    outcome: "Inbound reply received through Resend.",
                    createdBy: "resend-inbound",
                    completed: true
                }
            });

            if (deal) {
                await tx.deal.update({
                    where: {
                        id: deal.id
                    },
                    data: {
                        lastActivityAt: new Date()
                    }
                });
            }

            return {
                communicationEventId: communicationEvent.id,
                activityId: activity.id,
                contactId: fallbackContact.id,
                dealId: deal?.id
            };
        });

        const inboundBody =
            receivedEmail.text?.trim() ||
            receivedEmail.html?.trim() ||
            "Inbound email received without a text body.";

        await appendCommunicationMessage({
            conversationId: conversation.id,
            direction: "inbound",
            role: "system",
            content: inboundBody,
            sender: {
                channel: "email",
                externalId: senderEmail,
                displayName: senderEmail
            },
            externalMessageId: messageId,
            metadata: {
                provider: "resend",
                providerEventId,
                emailId,
                subject,
                inReplyTo,
                references
            }
        });

        if (
            result.activityId &&
            result.contactId &&
            companyId
        ) {
            void handleInboundSalesReply({
                activityId: result.activityId,
                contactId: result.contactId,
                companyId,
                dealId: result.dealId,
                companyName: fallbackContact?.company.name,
                contactEmail: senderEmail,
                subject,
                body: inboundBody,
                messageId,
                inReplyTo,
                references,
                conversationId: conversation.id
            });
        }

        return {
            duplicate: false,
            activityId: result.activityId,
            contactId: result.contactId,
            dealId: result.dealId,
            conversationId: conversation.id,
            emailId
        };
    } catch (error) {
        if (
            error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2002"
        ) {
            return {
                duplicate: true,
                emailId
            };
        }

        throw error;
    }
}
