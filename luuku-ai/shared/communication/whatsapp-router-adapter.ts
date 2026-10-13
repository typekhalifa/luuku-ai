import { config } from "../config/env";
import {
    normalizeWhatsAppPhoneNumber,
    WhatsAppCloudApiAdapter,
} from "./whatsapp-cloud-api-adapter";
import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest,
} from "./types";

function blockedResult(
    request: CommunicationRequest,
    summary: string,
    error: string,
): CommunicationExecutionResult {
    return {
        capability: request.capability,
        channel: request.channel,
        status: "blocked",
        executed: false,
        verified: false,
        summary,
        error,
    };
}

export class WhatsAppRouterAdapter implements CommunicationAdapter {
    readonly capability = "whatsapp.send" as const;
    readonly channel = "whatsapp" as const;

    private readonly adapter: WhatsAppCloudApiAdapter | null;

    constructor() {
        this.adapter =
            config.whatsappAccessToken.trim() &&
            config.whatsappPhoneNumberId.trim() &&
            config.whatsappGraphApiVersion.trim()
                ? new WhatsAppCloudApiAdapter({
                      accessToken: config.whatsappAccessToken,
                      phoneNumberId: config.whatsappPhoneNumberId,
                      graphApiVersion: config.whatsappGraphApiVersion,
                      mode: config.whatsappMode,
                      testRecipient: config.whatsappTestRecipient,
                      liveConfirmation: config.whatsappLiveConfirmation,
                  })
                : null;
    }

    isAvailable(): boolean {
        return this.adapter !== null;
    }

    async execute(
        request: CommunicationRequest,
    ): Promise<CommunicationExecutionResult> {
        if (!this.adapter) {
            return blockedResult(
                request,
                "WhatsApp Cloud API is not configured. Set WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, and WHATSAPP_GRAPH_API_VERSION.",
                "WHATSAPP_CONFIGURATION_MISSING",
            );
        }

        const recipient =
            request.recipientExternalId || request.recipient;

        if (!recipient) {
            return blockedResult(
                request,
                "WhatsApp recipient is missing.",
                "WHATSAPP_RECIPIENT_MISSING",
            );
        }
        if (!request.body?.trim()) {
            return blockedResult(
                request,
                "WhatsApp message body is missing.",
                "WHATSAPP_MESSAGE_BODY_MISSING",
            );
        }
        if (config.whatsappMode !== "live") {
            return blockedResult(
                request,
                "WhatsApp external delivery is disabled unless WHATSAPP_MODE=live.",
                "WHATSAPP_EXTERNAL_EXECUTION_DISABLED",
            );
        }
        if (config.whatsappLiveConfirmation !== "SEND_TO_CONTROLLED_TEST_CONTACT") {
            return blockedResult(
                request,
                "Live WhatsApp delivery requires explicit controlled-test confirmation.",
                "WHATSAPP_LIVE_CONFIRMATION_REQUIRED",
            );
        }
        if (!config.whatsappTestRecipient.trim()) {
            return blockedResult(
                request,
                "WhatsApp live delivery requires WHATSAPP_TEST_RECIPIENT.",
                "WHATSAPP_TEST_RECIPIENT_MISSING",
            );
        }
        try {
            if (
                normalizeWhatsAppPhoneNumber(recipient) !==
                normalizeWhatsAppPhoneNumber(config.whatsappTestRecipient)
            ) {
                return blockedResult(
                    request,
                    "WhatsApp live delivery is restricted to the configured controlled test recipient.",
                    "WHATSAPP_RECIPIENT_NOT_ALLOWLISTED",
                );
            }
        } catch {
            return blockedResult(
                request,
                "WhatsApp recipient must be a valid international E.164 phone number.",
                "WHATSAPP_RECIPIENT_INVALID",
            );
        }

        // Provider/network errors deliberately propagate to CommunicationRouter,
        // which records UNKNOWN and blocks automatic replay when acceptance is ambiguous.
        const externalId = await this.adapter.sendAndGetMessageId({
            conversationId:
                typeof request.metadata?.conversationId === "string"
                    ? request.metadata.conversationId
                    : `whatsapp:${recipient}`,
            recipient: {
                channel: "whatsapp",
                externalId: recipient,
            },
            content: request.body,
            metadata: request.metadata,
        });

        return {
            capability: this.capability,
            channel: this.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "whatsapp-cloud-api",
                externalId,
                reference: `whatsapp:message:${externalId}`,
                details: {
                    phoneNumberId: config.whatsappPhoneNumberId,
                    acceptance: "provider-message-id-returned",
                },
            },
            summary: "WhatsApp Cloud API accepted the outbound message and returned a provider message ID.",
        };
    }
}

export const whatsappRouterAdapter = new WhatsAppRouterAdapter();
