import { config } from "../config/env";
import type { WhatsAppWebhookEvent } from "../api/routes/whatsapp-webhook.route";
import type { CommunicationService } from "./communication-service";
import { prismaCommunicationService } from "./prisma-communication-service";
import type { CommunicationMessage } from "./message";
import { normalizeWhatsAppPhoneNumber } from "./whatsapp-cloud-api-adapter";

export interface WhatsAppFounderTextMessage {
    messageId: string;
    sender: string;
    text: string;
    phoneNumberId: string;
    timestamp?: string;
}

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | undefined {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as JsonRecord
        : undefined;
}

function asText(value: unknown): string | undefined {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
}

function isControlledRecipient(sender: string, controlledRecipient: string): boolean {
    try {
        return normalizeWhatsAppPhoneNumber(sender) ===
            normalizeWhatsAppPhoneNumber(controlledRecipient);
    } catch {
        return false;
    }
}

/**
 * Select only text messages from the explicitly configured controlled founder
 * number. Other inbound WhatsApp events are still durably captured by the
 * webhook, but they cannot invoke Lex or cause an outbound message.
 */
export function extractWhatsAppFounderTextMessages(
    events: WhatsAppWebhookEvent[],
    controlledRecipient: string,
): WhatsAppFounderTextMessage[] {
    if (!controlledRecipient.trim()) return [];

    const selected: WhatsAppFounderTextMessage[] = [];
    for (const event of events) {
        if (event.type !== "message.received" || !event.sender || !event.messageId) continue;
        if (!isControlledRecipient(event.sender, controlledRecipient)) continue;

        const eventPayload = asRecord(event.payload);
        const message = asRecord(eventPayload?.message);
        const messageType = asText(message?.type);
        if (messageType !== "text") continue;

        const text = asText(asRecord(message?.text)?.body);
        const phoneNumberId = asText(eventPayload?.phoneNumberId);
        if (!text || !phoneNumberId) continue;

        selected.push({
            messageId: event.messageId,
            sender: normalizeWhatsAppPhoneNumber(event.sender),
            text,
            phoneNumberId,
            timestamp: asText(message?.timestamp),
        });
    }

    return selected;
}

interface WhatsAppFounderLexResponder {
    respond(
        message: CommunicationMessage,
        delivery: { channel: "whatsapp"; recipientExternalId: string },
    ): Promise<{
        executionStatus: string;
        executed: boolean;
        verified: boolean;
    }>;
}

export interface WhatsAppFounderInboundResult {
    receivedMessages: number;
    authorizedMessages: number;
    repliesSent: number;
    skipped: number;
}

export class WhatsAppFounderInboundService {
    constructor(
        private readonly communicationService: Pick<CommunicationService, "receiveMessage"> = prismaCommunicationService,
        private readonly responder?: WhatsAppFounderLexResponder,
        private readonly runtimeConfig: Pick<typeof config, "whatsappMode" | "whatsappTestRecipient" | "whatsappAccessToken" | "whatsappPhoneNumberId" | "whatsappGraphApiVersion" | "whatsappLiveConfirmation"> = config,
    ) {}

    async processEvents(events: WhatsAppWebhookEvent[]): Promise<WhatsAppFounderInboundResult> {
        const textMessages = events.filter((event) => event.type === "message.received").length;
        const messages = extractWhatsAppFounderTextMessages(
            events,
            this.runtimeConfig.whatsappTestRecipient,
        ).filter(
            (message) => message.phoneNumberId === this.runtimeConfig.whatsappPhoneNumberId,
        );

        if (
            this.runtimeConfig.whatsappMode !== "live" ||
            !this.runtimeConfig.whatsappTestRecipient.trim() ||
            !this.runtimeConfig.whatsappAccessToken.trim() ||
            !this.runtimeConfig.whatsappPhoneNumberId.trim() ||
            !this.runtimeConfig.whatsappGraphApiVersion.trim() ||
            this.runtimeConfig.whatsappLiveConfirmation !== "SEND_TO_CONTROLLED_TEST_CONTACT"
        ) {
            return {
                receivedMessages: textMessages,
                authorizedMessages: 0,
                repliesSent: 0,
                skipped: textMessages,
            };
        }

        let repliesSent = 0;
        for (const message of messages) {
            const conversation = await this.communicationService.receiveMessage({
                channel: "whatsapp",
                externalConversationId: `whatsapp:founder:${message.sender}`,
                context: { ownership: { scope: "SYSTEM" } },
                sender: {
                    channel: "whatsapp",
                    externalId: message.sender,
                    displayName: "Founder",
                },
                content: message.text,
                metadata: {
                    provider: "whatsapp",
                    source: "whatsapp-founder-inbound",
                    externalMessageId: message.messageId,
                    providerMessageId: message.messageId,
                    phoneNumberId: message.phoneNumberId,
                    receivedAt: message.timestamp,
                },
            });

            // Load the AI-backed responder only after the live gate and sender
            // allowlist pass; webhook verification tests must not require AI secrets.
            const responder = this.responder ??
                (await import("./founder-lex-responder")).founderLexResponder;
            const result = await responder.respond(conversation, {
                channel: "whatsapp",
                recipientExternalId: message.sender,
            });
            if (!result.executed || !result.verified) {
                throw new Error(
                    `WhatsApp Lex reply was not verified: ${result.executionStatus}`,
                );
            }
            repliesSent += 1;
        }

        return {
            receivedMessages: textMessages,
            authorizedMessages: messages.length,
            repliesSent,
            skipped: textMessages - messages.length,
        };
    }
}

export const whatsappFounderInboundService = new WhatsAppFounderInboundService();
