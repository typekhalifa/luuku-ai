import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest
} from "./types";

const RESEND_ENDPOINT =
    "https://api.resend.com/emails";

function getConfig() {
    return {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.RESEND_FROM_EMAIL,
        mode: process.env.EMAIL_MODE || "test",
        testRecipient: process.env.EMAIL_TEST_RECIPIENT
    };
}

function blockedResult(
    request: CommunicationRequest,
    summary: string,
    error: string
): CommunicationExecutionResult {
    return {
        capability: request.capability,
        channel: request.channel,
        status: "blocked",
        executed: false,
        verified: false,
        summary,
        error
    };
}

function metadataString(
    request: CommunicationRequest,
    key: string
): string | undefined {
    const value = request.metadata?.[key];
    return typeof value === "string"
        ? value
        : undefined;
}

export const resendEmailAdapter: CommunicationAdapter = {

    capability: "email.send",

    channel: "email",

    isAvailable(): boolean {
        const { apiKey, from } = getConfig();
        return Boolean(apiKey && from);
    },

    async execute(
        request: CommunicationRequest
    ): Promise<CommunicationExecutionResult> {

        const { apiKey, from, mode, testRecipient } = getConfig();

        if (!apiKey || !from) {
            return blockedResult(
                request,
                "Real email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
                "EMAIL_PROVIDER_NOT_CONFIGURED"
            );
        }

        const recipient =
            request.recipientExternalId ||
            request.recipient;

        if (!recipient) {
            return blockedResult(
                request,
                "Email recipient is missing.",
                "EMAIL_RECIPIENT_MISSING"
            );
        }

        if (mode === "test") {
            if (!testRecipient) {
                return blockedResult(
                    request,
                    "Test email mode requires EMAIL_TEST_RECIPIENT.",
                    "EMAIL_TEST_RECIPIENT_NOT_CONFIGURED"
                );
            }

            if (recipient.toLowerCase() !== testRecipient.toLowerCase()) {
                return blockedResult(
                    request,
                    `Test mode only permits delivery to ${testRecipient}.`,
                    "EMAIL_TEST_RECIPIENT_BLOCKED"
                );
            }
        }

        if (!request.subject) {
            return blockedResult(
                request,
                "Email subject is missing.",
                "EMAIL_SUBJECT_MISSING"
            );
        }

        if (!request.body) {
            return blockedResult(
                request,
                "Email body is missing.",
                "EMAIL_BODY_MISSING"
            );
        }

        try {
            const html =
                metadataString(request, "html") ||
                request.body;

            const replyTo =
                metadataString(request, "replyTo");

            const inReplyTo =
                metadataString(request, "inReplyTo");

            const references =
                metadataString(request, "references");

            const idempotencyKey =
                metadataString(request, "idempotencyKey") ||
                metadataString(request, "taskId");

            const headers: Record<string, string> = {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            };

            if (idempotencyKey) {
                headers["Idempotency-Key"] = idempotencyKey;
            }

            const emailHeaders: Record<string, string> = {};

            if (inReplyTo) {
                emailHeaders["In-Reply-To"] = inReplyTo;
            }

            if (references) {
                emailHeaders["References"] = references;
            }

            const tags = [
                {
                    name: "luuku_source",
                    value: metadataString(request, "source") || "communication-router"
                },
                {
                    name: "luuku_capability",
                    value: request.capability.replace(/[^a-zA-Z0-9_-]/g, "_")
                }
            ];

            const response = await fetch(
                RESEND_ENDPOINT,
                {
                    method: "POST",
                    headers,
                    body: JSON.stringify({
                        from,
                        to: [recipient],
                        subject: request.subject,
                        html,
                        text: request.body,
                        tags,
                        ...(replyTo
                            ? { reply_to: replyTo }
                            : {}),
                        ...(Object.keys(emailHeaders).length
                            ? { headers: emailHeaders }
                            : {})
                    })
                }
            );

            const payload =
                await response.json() as {
                    id?: string;
                    message?: string;
                    name?: string;
                };

            if (!response.ok || !payload.id) {
                return {
                    capability: request.capability,
                    channel: request.channel,
                    status: "failed",
                    executed: false,
                    verified: false,
                    summary:
                        "Resend rejected the outbound email request.",
                    error:
                        payload.message ||
                        payload.name ||
                        `RESEND_HTTP_${response.status}`
                };
            }

            return {
                capability: request.capability,
                channel: request.channel,
                status: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "resend",
                    externalId: payload.id,
                    details: {
                        recipient,
                        from,
                        providerAccepted: true,
                        mode,
                        idempotencyKey,
                        threadedReply: Boolean(inReplyTo),
                        inReplyTo,
                        references
                    }
                },
                summary:
                    `Email accepted by Resend for delivery to ${recipient}.`
            };

        } catch (error) {
            return {
                capability: request.capability,
                channel: request.channel,
                status: "failed",
                executed: false,
                verified: false,
                summary:
                    "Outbound email failed before provider confirmation.",
                error:
                    error instanceof Error
                        ? error.message
                        : String(error)
            };
        }
    }
};
