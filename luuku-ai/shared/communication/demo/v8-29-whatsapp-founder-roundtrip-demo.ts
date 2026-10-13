import type { CommunicationService } from "../communication-service";
import type { CommunicationMessage } from "../message";
import type { WhatsAppWebhookEvent } from "../../api/routes/whatsapp-webhook.route";
import { WhatsAppFounderInboundService } from "../whatsapp-founder-inbound.service";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
    const inbound: WhatsAppWebhookEvent[] = [
        {
            providerEventId: "synthetic:founder-message-1",
            type: "message.received",
            externalId: "wamid.synthetic-founder-1",
            messageId: "wamid.synthetic-founder-1",
            sender: "250788123456",
            recipient: "+250788000000",
            payload: {
                phoneNumberId: "synthetic-phone-number-id",
                message: {
                    id: "wamid.synthetic-founder-1",
                    from: "250788123456",
                    timestamp: "1790000000",
                    type: "text",
                    text: { body: "Lex, give me a short status update." },
                },
            },
        },
        {
            providerEventId: "synthetic:untrusted-sender",
            type: "message.received",
            externalId: "wamid.synthetic-untrusted",
            messageId: "wamid.synthetic-untrusted",
            sender: "250799000000",
            payload: {
                phoneNumberId: "synthetic-phone-number-id",
                message: {
                    id: "wamid.synthetic-untrusted",
                    from: "250799000000",
                    type: "text",
                    text: { body: "Please reply to me too." },
                },
            },
        },
        {
            providerEventId: "synthetic:non-text",
            type: "message.received",
            externalId: "wamid.synthetic-image",
            messageId: "wamid.synthetic-image",
            sender: "250788123456",
            payload: {
                phoneNumberId: "synthetic-phone-number-id",
                message: {
                    id: "wamid.synthetic-image",
                    from: "250788123456",
                    type: "image",
                    image: { id: "synthetic-media-id" },
                },
            },
        },
        {
            providerEventId: "synthetic:delivery-status",
            type: "message.status.delivered",
            externalId: "wamid.synthetic-outbound",
            messageId: "wamid.synthetic-outbound",
            payload: {
                phoneNumberId: "synthetic-phone-number-id",
                status: { id: "wamid.synthetic-outbound", status: "delivered" },
            },
        },
    ];

    const received: Array<Record<string, unknown>> = [];
    const deliveries: Array<{ channel: string; recipientExternalId?: string }> = [];
    const syntheticMessage: CommunicationMessage = {
        id: "synthetic-stored-message",
        conversationId: "synthetic-whatsapp-founder-conversation",
        direction: "inbound",
        role: "system",
        content: "Lex, give me a short status update.",
        sender: {
            channel: "whatsapp",
            externalId: "250788123456",
            displayName: "Founder",
        },
        timestamp: new Date(0).toISOString(),
        metadata: {},
    };

    const communicationService = {
        receiveMessage: async (input: Record<string, unknown>) => {
            received.push(input);
            return syntheticMessage;
        },
    } as unknown as Pick<CommunicationService, "receiveMessage">;

    const responder = {
        respond: async (
            _message: CommunicationMessage,
            delivery: { channel: "discord" | "whatsapp"; recipientExternalId?: string },
        ) => {
            deliveries.push(delivery);
            return {
                response: "Synthetic Lex response. No WhatsApp message sent.",
                executionStatus: "verified",
                executed: true,
                verified: true,
                conversationId: syntheticMessage.conversationId,
            };
        },
    };

    const service = new WhatsAppFounderInboundService(
        communicationService,
        responder,
        {
            whatsappMode: "live",
            whatsappTestRecipient: "+250788123456",
            whatsappAccessToken: "synthetic-token",
            whatsappPhoneNumberId: "synthetic-phone-number-id",
            whatsappGraphApiVersion: "v22.0",
            whatsappLiveConfirmation: "SEND_TO_CONTROLLED_TEST_CONTACT",
        },
    );

    const result = await service.processEvents(inbound);
    assert(result.receivedMessages === 3, "Expected three inbound message events.");
    assert(result.authorizedMessages === 1, "Only the configured founder number may invoke Lex.");
    assert(result.repliesSent === 1, "Expected one synthetic reply path.");
    assert(result.skipped === 2, "Untrusted sender and non-text message must be skipped.");
    assert(received.length === 1, "Only one authorized message may enter the conversation service.");
    assert(received[0].channel === "whatsapp", "Inbound message must use the WhatsApp channel.");
    assert(received[0].content === "Lex, give me a short status update.", "Inbound text was not preserved.");
    assert(deliveries.length === 1, "Expected exactly one Lex delivery request.");
    assert(deliveries[0].channel === "whatsapp", "Lex response must use the WhatsApp channel.");
    assert(deliveries[0].recipientExternalId === "250788123456", "Reply must target the allowlisted founder number.");

    const disabledService = new WhatsAppFounderInboundService(
        communicationService,
        responder,
        {
            whatsappMode: "test",
            whatsappTestRecipient: "+250788123456",
            whatsappAccessToken: "synthetic-token",
            whatsappPhoneNumberId: "synthetic-phone-number-id",
            whatsappGraphApiVersion: "v22.0",
            whatsappLiveConfirmation: "SEND_TO_CONTROLLED_TEST_CONTACT",
        },
    );
    const beforeDisabledRun = deliveries.length;
    const disabled = await disabledService.processEvents(inbound);
    assert(disabled.repliesSent === 0, "Test mode must never invoke the reply path.");
    assert(deliveries.length === beforeDisabledRun, "Test mode must not call the responder.");

    console.log("PHASE 5.6 — WHATSAPP FOUNDER ROUND TRIP");
    console.log("Allowlisted founder text routing: PASS");
    console.log("Untrusted sender and non-text message suppression: PASS");
    console.log("WhatsApp channel and controlled-recipient selection: PASS");
    console.log("Test mode blocks all reply execution: PASS");
    console.log("Real network requests made: 0");
    console.log("Real WhatsApp messages sent: 0");
    console.log("PHASE 5.6 WHATSAPP FOUNDER ROUND TRIP: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
