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
        from: process.env.RESEND_FROM_EMAIL
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

        const { apiKey, from } = getConfig();

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
            const response = await fetch(
                RESEND_ENDPOINT,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${apiKey}`,
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        from,
                        to: [recipient],
                        subject: request.subject,
                        html:
                            request.metadata?.html ||
                            request.body,
                        text: request.body,
                        ...(request.metadata?.replyTo
                            ? {
                                reply_to:
                                    request.metadata.replyTo
                            }
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
                        providerAccepted: true
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
