import { config } from "../config/env";
import {
    normalizeWhatsAppPhoneNumber,
    WhatsAppApiRejectionError,
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

type WhatsAppRouterAdapterConfig = Pick<
    typeof config,
    | "whatsappAccessToken"
    | "whatsappPhoneNumberId"
    | "whatsappGraphApiVersion"
    | "whatsappMode"
    | "whatsappTestRecipient"
    | "whatsappLiveConfirmation"
>;

export class WhatsAppRouterAdapter implements CommunicationAdapter {
    readonly capability = "whatsapp.send" as const;
    readonly channel = "whatsapp" as const;

    private readonly adapter: WhatsAppCloudApiAdapter | null;
    private readonly runtimeConfig: WhatsAppRouterAdapterConfig;

    constructor(
        runtimeConfig: WhatsAppRouterAdapterConfig = config,
        adapterOverride?: WhatsAppCloudApiAdapter | null,
    ) {
        this.runtimeConfig = runtimeConfig;
        this.adapter = adapterOverride !== undefined
            ? adapterOverride
            : runtimeConfig.whatsappAccessToken.trim() &&
                runtimeConfig.whatsappPhoneNumberId.trim() &&
                runtimeConfig.whatsappGraphApiVersion.trim()
                ? new WhatsAppCloudApiAdapter({
                      accessToken: runtimeConfig.whatsappAccessToken,
                      phoneNumberId: runtimeConfig.whatsappPhoneNumberId,
                      graphApiVersion: runtimeConfig.whatsappGraphApiVersion,
                      mode: runtimeConfig.whatsappMode,
                      testRecipient: runtimeConfig.whatsappTestRecipient,
                      liveConfirmation: runtimeConfig.whatsappLiveConfirmation,
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
        if (request.metadata?.executionMode !== "live") {
            return blockedResult(
                request,
                "WhatsApp delivery requires request-level executionMode=live consent.",
                "WHATSAPP_REQUEST_LIVE_CONSENT_REQUIRED",
            );
        }
        if (this.runtimeConfig.whatsappMode !== "live") {
            return blockedResult(
                request,
                "WhatsApp external delivery is disabled unless WHATSAPP_MODE=live.",
                "WHATSAPP_EXTERNAL_EXECUTION_DISABLED",
            );
        }
        if (this.runtimeConfig.whatsappLiveConfirmation !== "SEND_TO_CONTROLLED_TEST_CONTACT") {
            return blockedResult(
                request,
                "Live WhatsApp delivery requires explicit controlled-test confirmation.",
                "WHATSAPP_LIVE_CONFIRMATION_REQUIRED",
            );
        }
        if (!this.runtimeConfig.whatsappTestRecipient.trim()) {
            return blockedResult(
                request,
                "WhatsApp live delivery requires WHATSAPP_TEST_RECIPIENT.",
                "WHATSAPP_TEST_RECIPIENT_MISSING",
            );
        }
        try {
            if (
                normalizeWhatsAppPhoneNumber(recipient) !==
                normalizeWhatsAppPhoneNumber(this.runtimeConfig.whatsappTestRecipient)
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

        let externalId: string;
        try {
            externalId = await this.adapter.sendAndGetMessageId({
                conversationId:
                    typeof request.metadata?.conversationId === "string"
                        ? request.metadata.conversationId
                        : "whatsapp:" + recipient,
                recipient: {
                    channel: "whatsapp",
                    externalId: recipient,
                },
                content: request.body,
                metadata: request.metadata,
            });
        } catch (error) {
            if (error instanceof WhatsAppApiRejectionError) {
                return {
                    capability: this.capability,
                    channel: this.channel,
                    status: "failed",
                    executed: false,
                    verified: false,
                    summary: "WhatsApp Cloud API explicitly rejected the outbound request; no message was accepted.",
                    error: "WHATSAPP_PROVIDER_REJECTED_" + error.statusCode,
                };
            }
            // Transport/network failures and ambiguous success responses must
            // propagate so CommunicationRouter records UNKNOWN and blocks replay.
            throw error;
        }

        return {
            capability: this.capability,
            channel: this.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "whatsapp-cloud-api",
                externalId,
                reference: "whatsapp:message:" + externalId,
                details: {
                    phoneNumberId: this.runtimeConfig.whatsappPhoneNumberId,
                    acceptance: "provider-message-id-returned",
                },
            },
            summary: "WhatsApp Cloud API accepted the outbound message and returned a provider message ID.",
        };;
    }
}

export const whatsappRouterAdapter = new WhatsAppRouterAdapter();
