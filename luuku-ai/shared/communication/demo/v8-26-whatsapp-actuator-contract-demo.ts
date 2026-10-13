import {
    normalizeWhatsAppPhoneNumber,
    WhatsAppCloudApiAdapter,
    type WhatsAppFetch,
} from "../whatsapp-cloud-api-adapter";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) {
        throw new Error(message);
    }
}

async function main(): Promise<void> {
    let calls = 0;
    let lastUrl = "";
    let lastInit: RequestInit | undefined;

    const fakeFetch: WhatsAppFetch = async (input, init) => {
        calls += 1;
        lastUrl = input;
        lastInit = init;
        return new Response(
            JSON.stringify({ messaging_product: "whatsapp", messages: [{ id: "wamid.synthetic-001" }] }),
            { status: 200, headers: { "Content-Type": "application/json" } },
        );
    };

    const config = {
        accessToken: "synthetic-token",
        phoneNumberId: "synthetic-phone-number-id",
        graphApiVersion: "v99.0",
        mode: "live",
        testRecipient: "+250788123456",
        liveConfirmation: "SEND_TO_CONTROLLED_TEST_CONTACT",
    };

    const adapter = new WhatsAppCloudApiAdapter(config, fakeFetch);
    await adapter.send({
        conversationId: "phase5.5-whatsapp-test",
        recipient: { channel: "whatsapp", externalId: "250788123456" },
        content: "Synthetic test message; fake transport only.",
    });

    assert(calls === 1, "Expected exactly one injected fake-fetch call.");
    assert(lastUrl === "https://graph.facebook.com/v99.0/synthetic-phone-number-id/messages", "Unexpected Graph API URL.");
    assert(lastInit?.method === "POST", "Expected POST request.");
    const headers = lastInit?.headers as Record<string, string>;
    assert(headers.Authorization === "Bearer synthetic-token", "Bearer authorization header missing.");
    const body = JSON.parse(String(lastInit?.body)) as Record<string, unknown>;
    assert(body.messaging_product === "whatsapp", "Missing WhatsApp product marker.");
    assert(body.to === "250788123456", "Recipient should be normalized to international digits.");
    assert(body.type === "text", "Expected text message payload.");
    assert((body.text as { body?: string }).body === "Synthetic test message; fake transport only.", "Message body mismatch.");

    let recipientBlocked = false;
    try {
        await adapter.send({
            conversationId: "phase5.5-whatsapp-test",
            recipient: { channel: "whatsapp", externalId: "+250788999999" },
            content: "Must not be sent.",
        });
    } catch (error) {
        recipientBlocked = error instanceof Error && error.message.includes("controlled test recipient");
    }
    assert(recipientBlocked, "Unexpected recipient must be blocked.");
    assert(calls === 1, "Recipient-blocked attempt must not call the transport.");

    const testModeAdapter = new WhatsAppCloudApiAdapter(
        { ...config, mode: "test" },
        fakeFetch,
    );
    let testModeBlocked = false;
    try {
        await testModeAdapter.send({
            conversationId: "phase5.5-whatsapp-test",
            recipient: { channel: "whatsapp", externalId: "+250788123456" },
            content: "Must not be sent.",
        });
    } catch (error) {
        testModeBlocked = error instanceof Error && error.message.includes("WHATSAPP_MODE=live");
    }
    assert(testModeBlocked, "Test mode must block external delivery.");
    assert(calls === 1, "Test-mode blocked attempt must not call the transport.");

    let invalidNumberBlocked = false;
    try {
        normalizeWhatsAppPhoneNumber("not-a-phone");
    } catch {
        invalidNumberBlocked = true;
    }
    assert(invalidNumberBlocked, "Invalid recipient phone number must be rejected.");

    const normalized = await adapter.normalizeInbound({
        channel: "whatsapp",
        sender: { channel: "whatsapp", externalId: "+250788123456" },
        content: "Inbound synthetic message",
    });
    assert(normalized.sender.externalId === "250788123456", "Inbound sender phone normalization failed.");

    console.log("PHASE 5.5 — WHATSAPP ACTUATOR CONTRACT");
    console.log("Injected fake transport payload and provider evidence: PASS");
    console.log("Controlled-recipient enforcement: PASS");
    console.log("Test-mode external-send block: PASS");
    console.log("E.164 phone validation and inbound normalization: PASS");
    console.log("Real network requests made: 0");
    console.log("PHASE 5.5 WHATSAPP CONTRACT: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
