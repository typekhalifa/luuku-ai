import {
    CommunicationChannelAdapter,
    InboundChannelMessage,
    OutboundChannelMessage,
} from "./channel-adapter";

export interface WhatsAppCloudApiConfig {
    accessToken: string;
    phoneNumberId: string;
    graphApiVersion: string;
    mode: string;
    testRecipient: string;
    liveConfirmation: string;
}

export type WhatsAppFetch = (
    input: string,
    init?: RequestInit,
) => Promise<Response>;

interface WhatsAppSendResponse {
    messages?: Array<{ id?: string }>;
    error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
    };
}

export function normalizeWhatsAppPhoneNumber(value: string): string {
    const trimmed = value.trim();
    if (!/^\+?[1-9]\d{7,14}$/.test(trimmed)) {
        throw new Error("WhatsApp recipient must be an international phone number in E.164 format.");
    }
    return trimmed.replace(/^\+/, "");
}

/**
 * Minimal WhatsApp Business Cloud API transport.
 *
 * This adapter intentionally permits live sends only to the explicitly
 * configured controlled test recipient. Broader recipient access should be
 * introduced only with a separately reviewed authorization policy.
 */
export class WhatsAppCloudApiAdapter implements CommunicationChannelAdapter {
    readonly channel = "whatsapp" as const;

    private readonly apiBaseUrl: string;
    private readonly fetchImpl: WhatsAppFetch;

    constructor(
        private readonly config: WhatsAppCloudApiConfig,
        fetchImpl: WhatsAppFetch = fetch,
    ) {
        if (!config.accessToken.trim()) {
            throw new Error("WhatsApp Cloud API requires an access token.");
        }
        if (!config.phoneNumberId.trim()) {
            throw new Error("WhatsApp Cloud API requires a phone-number ID.");
        }
        if (!/^v\d+\.\d+$/.test(config.graphApiVersion.trim())) {
            throw new Error("WHATSAPP_GRAPH_API_VERSION must look like vNN.N.");
        }
        this.apiBaseUrl = `https://graph.facebook.com/${config.graphApiVersion.trim()}`;
        this.fetchImpl = fetchImpl;
    }

    async send(message: OutboundChannelMessage): Promise<void> {
        if (this.config.mode !== "live") {
            throw new Error("WhatsApp external delivery is disabled unless WHATSAPP_MODE=live.");
        }
        if (this.config.liveConfirmation !== "SEND_TO_CONTROLLED_TEST_CONTACT") {
            throw new Error("WhatsApp live delivery requires LUUKU_WHATSAPP_LIVE_CONFIRMATION=SEND_TO_CONTROLLED_TEST_CONTACT.");
        }
        if (!this.config.testRecipient.trim()) {
            throw new Error("WhatsApp live delivery requires WHATSAPP_TEST_RECIPIENT.");
        }

        const recipient = normalizeWhatsAppPhoneNumber(message.recipient.externalId ?? "");
        const allowedRecipient = normalizeWhatsAppPhoneNumber(this.config.testRecipient);
        if (recipient !== allowedRecipient) {
            throw new Error("WhatsApp live delivery is restricted to the configured controlled test recipient.");
        }
        if (!message.content.trim()) {
            throw new Error("WhatsApp message body cannot be empty.");
        }

        const response = await this.fetchImpl(
            `${this.apiBaseUrl}/${encodeURIComponent(this.config.phoneNumberId)}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${this.config.accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    messaging_product: "whatsapp",
                    recipient_type: "individual",
                    to: recipient,
                    type: "text",
                    text: {
                        preview_url: false,
                        body: message.content,
                    },
                }),
            },
        );

        if (!response.ok) {
            const body = await response.text();
            throw new Error(`WhatsApp Cloud API request failed (${response.status} ${response.statusText}): ${body}`);
        }

        let payload: WhatsAppSendResponse;
        try {
            payload = await response.json() as WhatsAppSendResponse;
        } catch {
            throw new Error("WhatsApp Cloud API returned an unreadable response; delivery outcome requires reconciliation.");
        }
        if (!payload.messages?.[0]?.id) {
            throw new Error("WhatsApp Cloud API response omitted the message ID; delivery outcome requires reconciliation.");
        }
    }

    async normalizeInbound(message: InboundChannelMessage): Promise<InboundChannelMessage> {
        if (message.channel !== this.channel) {
            throw new Error(`WhatsApp adapter cannot normalize channel: ${message.channel}`);
        }
        if (!message.sender.externalId) {
            throw new Error("Inbound WhatsApp message is missing the sender's external ID.");
        }
        return {
            ...message,
            sender: {
                ...message.sender,
                externalId: normalizeWhatsAppPhoneNumber(message.sender.externalId),
            },
        };
    }
}

export function parseWhatsAppSendResponse(
    response: unknown,
): { messageId: string } {
    if (!response || typeof response !== "object" || Array.isArray(response)) {
        throw new Error("Invalid WhatsApp Cloud API send response.");
    }
    const messages = (response as WhatsAppSendResponse).messages;
    const messageId = messages?.[0]?.id;
    if (typeof messageId !== "string" || !messageId.trim()) {
        throw new Error("WhatsApp Cloud API response did not contain a message ID.");
    }
    return { messageId };
}
