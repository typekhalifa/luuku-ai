import crypto from "node:crypto";
import https from "node:https";

import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest
} from "./types";

const RESEND_ENDPOINT =
    "https://api.resend.com/emails";

const LIVE_TEST_CONFIRMATION =
    "SEND_TO_CONTROLLED_TEST_CONTACT";

function getConfig() {
    return {
        apiKey: process.env.RESEND_API_KEY,
        from: process.env.RESEND_FROM_EMAIL,
        mode: process.env.EMAIL_MODE || "test",
        testRecipient:
            process.env.EMAIL_TEST_RECIPIENT ||
            process.env.LUUKU_TEST_CONTACT_EMAIL,
        liveTestConfirmation:
            process.env.LUUKU_LIVE_EMAIL_CONFIRMATION
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

        const {
            apiKey,
            from,
            mode,
            testRecipient,
            liveTestConfirmation
        } = getConfig();

        const executionMode =
            metadataString(request, "executionMode");

        if (executionMode === "sandbox") {
            const recipient =
                request.recipientExternalId ||
                request.recipient;

            if (!recipient) {
                return blockedResult(
                    request,
                    "Sandbox email recipient is missing.",
                    "EMAIL_RECIPIENT_MISSING"
                );
            }

            if (!testRecipient) {
                return blockedResult(
                    request,
                    "Sandbox email requires a configured controlled test recipient.",
                    "SANDBOX_TEST_RECIPIENT_NOT_CONFIGURED"
                );
            }

            if (
                recipient.toLowerCase() !== testRecipient.toLowerCase()
            ) {
                return blockedResult(
                    request,
                    `Sandbox execution only permits the configured test recipient ${testRecipient}.`,
                    "SANDBOX_RECIPIENT_MISMATCH"
                );
            }

            if (!request.subject) {
                return blockedResult(
                    request,
                    "Sandbox email subject is missing.",
                    "EMAIL_SUBJECT_MISSING"
                );
            }

            if (!request.body) {
                return blockedResult(
                    request,
                    "Sandbox email body is missing.",
                    "EMAIL_BODY_MISSING"
                );
            }

            const sandboxId =
                `sandbox-email-${crypto.randomUUID()}`;

            return {
                capability: request.capability,
                channel: request.channel,
                status: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "sandbox-email",
                    externalId: sandboxId,
                    details: {
                        recipient,
                        subject: request.subject,
                        transport: "local-sandbox",
                        networkRequestMade: false,
                        providerAccepted: true,
                        mode: "sandbox"
                    }
                },
                summary:
                    `Sandbox email execution verified for ${recipient}. No external network request was made.`
            };
        }

        if (!apiKey || !from) {
            return blockedResult(
                request,
                "Real email is not configured. Set RESEND_API_KEY and RESEND_FROM_EMAIL.",
                "EMAIL_PROVIDER_NOT_CONFIGURED"
            );
        }

        // Defense in depth: only an explicitly live request can reach Resend.
        if (executionMode !== "live") {
            return blockedResult(
                request,
                "External email delivery is disabled unless executionMode is explicitly live.",
                "EMAIL_EXTERNAL_EXECUTION_DISABLED"
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

        // The first live test is intentionally restricted to the founder's
        // controlled test inbox. A live provider call cannot be enabled for
        // arbitrary CRM contacts by merely switching EMAIL_MODE to live.
        if (!testRecipient) {
            return blockedResult(
                request,
                "Live controlled email requires LUUKU_TEST_CONTACT_EMAIL or EMAIL_TEST_RECIPIENT.",
                "LIVE_TEST_RECIPIENT_NOT_CONFIGURED"
            );
        }

        if (
            recipient.toLowerCase() !== testRecipient.toLowerCase()
        ) {
            return blockedResult(
                request,
                `Live controlled execution only permits the configured test recipient ${testRecipient}.`,
                "LIVE_TEST_RECIPIENT_BLOCKED"
            );
        }

        // Require an explicit opt-in phrase before making the first real
        // network request. This prevents a stale environment setting from
        // accidentally turning a demo into external communication.
        if (liveTestConfirmation !== LIVE_TEST_CONFIRMATION) {
            return blockedResult(
                request,
                `Live delivery to the controlled test contact requires LUUKU_LIVE_EMAIL_CONFIRMATION=${LIVE_TEST_CONFIRMATION}.`,
                "LIVE_TEST_CONFIRMATION_REQUIRED"
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

            const payloadBody = JSON.stringify({
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
            });

            const response = await new Promise<{
                statusCode: number;
                body: string;
            }>((resolve, reject) => {
                const endpoint = new URL(RESEND_ENDPOINT);

                const req = https.request({
                    protocol: endpoint.protocol,
                    hostname: endpoint.hostname,
                    port: endpoint.port || 443,
                    path: `${endpoint.pathname}${endpoint.search}`,
                    method: "POST",
                    headers: {
                        ...headers,
                        "Content-Length": Buffer.byteLength(payloadBody)
                    },
                    timeout: 15000
                }, res => {
                    const chunks: Buffer[] = [];

                    res.on("data", chunk => {
                        chunks.push(Buffer.isBuffer(chunk)
                            ? chunk
                            : Buffer.from(chunk));
                    });

                    res.on("end", () => {
                        resolve({
                            statusCode: res.statusCode || 0,
                            body: Buffer.concat(chunks).toString("utf8")
                        });
                    });
                });

                req.on("timeout", () => {
                    req.destroy(new Error("Resend request timed out."));
                });

                req.on("error", reject);
                req.write(payloadBody);
                req.end();
            });

            let payload: {
                id?: string;
                message?: string;
                name?: string;
            } = {};

            try {
                payload = response.body
                    ? JSON.parse(response.body) as typeof payload
                    : {};
            } catch {
                payload = {};
            }

            if (response.statusCode < 200 || response.statusCode >= 300 || !payload.id) {
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
                        `RESEND_HTTP_${response.statusCode}`
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
