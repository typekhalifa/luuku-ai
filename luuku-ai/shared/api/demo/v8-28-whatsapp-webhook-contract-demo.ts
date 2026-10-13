import crypto from "node:crypto";

import { prisma } from "../../database/client";
import {
    extractWhatsAppWebhookEvents,
    persistWhatsAppWebhookPayload,
    verifyWhatsAppWebhookSignature,
} from "../routes/whatsapp-webhook.route";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
    const runId = Date.now().toString() + "-" + process.pid;
    const messageId = "wamid.synthetic-" + runId;
    const appSecret = "synthetic-meta-app-secret";
    const payload = {
        object: "whatsapp_business_account",
        entry: [{
            id: "synthetic-business-account",
            changes: [{
                field: "messages",
                value: {
                    messaging_product: "whatsapp",
                    metadata: {
                        display_phone_number: "+250788000000",
                        phone_number_id: "synthetic-phone-number-id",
                    },
                    messages: [{
                        from: "250788123456",
                        id: messageId,
                        timestamp: "1790000000",
                        type: "text",
                        text: { body: "Synthetic inbound test; no network calls." },
                    }],
                    statuses: [{
                        id: messageId,
                        status: "delivered",
                        timestamp: "1790000001",
                        recipient_id: "250788123456",
                    }],
                },
            }],
        }],
    };

    const rawBody = JSON.stringify(payload);
    const signature = "sha256=" + crypto
        .createHmac("sha256", appSecret)
        .update(rawBody, "utf8")
        .digest("hex");

    assert(
        verifyWhatsAppWebhookSignature(rawBody, signature, appSecret),
        "Valid Meta HMAC signature should be accepted.",
    );
    assert(
        !verifyWhatsAppWebhookSignature(rawBody, signature, "wrong-secret"),
        "Invalid app secret must fail signature verification.",
    );
    assert(
        !verifyWhatsAppWebhookSignature(rawBody, undefined, appSecret),
        "Missing signature must fail closed.",
    );
    assert(
        !verifyWhatsAppWebhookSignature(rawBody, signature, ""),
        "Missing app secret must fail closed.",
    );

    const events = extractWhatsAppWebhookEvents(payload);
    assert(events.length === 2, "Expected one inbound-message event and one status event.");
    assert(events[0].type === "message.received", "Inbound message event type mismatch.");
    assert(events[0].providerEventId.includes(messageId), "Inbound message event ID must include stable provider identity.");
    assert(events[1].type === "message.status.delivered", "Delivery status event type mismatch.");
    const replayEvents = extractWhatsAppWebhookEvents(JSON.parse(rawBody) as unknown);
    assert(
        events.map((event) => event.providerEventId).join("|") ===
            replayEvents.map((event) => event.providerEventId).join("|"),
        "Replaying the same provider payload must derive identical event IDs.",
    );

    const eventIds = events.map((event) => event.providerEventId);
    try {
        const first = await persistWhatsAppWebhookPayload(payload);
        assert(first.received === 2 && first.inserted === 2 && first.duplicates === 0,
            "First webhook delivery should persist both events.");
        const replay = await persistWhatsAppWebhookPayload(payload);
        assert(replay.received === 2 && replay.inserted === 0 && replay.duplicates === 2,
            "Duplicate webhook delivery must be idempotently acknowledged.");

        const stored = await prisma.communicationEvent.findMany({
            where: { providerEventId: { in: eventIds } },
        });
        assert(stored.length === 2, "Expected both provider events to exist in PostgreSQL.");
        assert(stored.every((event) => event.provider === "whatsapp"), "Persisted events must be tagged as WhatsApp.");
        assert(stored.every((event) => event.ownershipScope === "SYSTEM" && !event.companyId),
            "Unresolved inbound events must remain system-scoped until tenant resolution.");

        console.log("PHASE 5.5 — WHATSAPP INBOUND WEBHOOK");
        console.log("Meta HMAC signature validation and fail-closed missing-secret behavior: PASS");
        console.log("Inbound message and status parsing with stable event identities: PASS");
        console.log("PostgreSQL persistence and duplicate webhook idempotency: PASS");
        console.log("Unresolved events remain system-scoped pending tenant resolution: PASS");
        console.log("Real network requests made: 0");
        console.log("PHASE 5.5 WHATSAPP WEBHOOK: PASS");
    } finally {
        await prisma.communicationEvent.deleteMany({
            where: { providerEventId: { in: eventIds } },
        });
        await prisma.$disconnect();
    }
}

main().catch(async (error) => {
    console.error(error);
    await prisma.$disconnect().catch(() => undefined);
    process.exitCode = 1;
});
