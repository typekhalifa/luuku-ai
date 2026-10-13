import crypto from "node:crypto";
import { Prisma } from "@prisma/client";
import { Router, Request, Response } from "express";

import { prisma } from "../../database/client";

const router = Router();

type JsonRecord = Record<string, unknown>;

export interface WhatsAppWebhookEvent {
    providerEventId: string;
    type: string;
    externalId?: string;
    messageId?: string;
    sender?: string;
    recipient?: string;
    payload: JsonRecord;
}

function asRecord(value: unknown): JsonRecord | undefined {
    return value !== null && typeof value === "object" && !Array.isArray(value)
        ? value as JsonRecord
        : undefined;
}

function asString(value: unknown): string | undefined {
    return typeof value === "string" && value.trim()
        ? value.trim()
        : undefined;
}

function safeStringEqual(left: string, right: string): boolean {
    const a = Buffer.from(left, "utf8");
    const b = Buffer.from(right, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Verify Meta's X-Hub-Signature-256 against the exact raw request body. */
export function verifyWhatsAppWebhookSignature(
    rawBody: string,
    signatureHeader: string | undefined,
    appSecret: string,
): boolean {
    if (!rawBody || !signatureHeader || !appSecret) return false;
    if (!/^sha256=[a-fA-F0-9]{64}$/.test(signatureHeader)) return false;

    const expected = "sha256=" + crypto
        .createHmac("sha256", appSecret)
        .update(rawBody, "utf8")
        .digest("hex");

    return safeStringEqual(expected.toLowerCase(), signatureHeader.toLowerCase());
}

function stableStatusEventId(
    phoneNumberId: string,
    messageId: string,
    status: string,
    timestamp: string,
    recipientId: string,
): string {
    const identity = [phoneNumberId, messageId, status, timestamp, recipientId].join("|");
    return "whatsapp:status:" + crypto.createHash("sha256").update(identity).digest("hex");
}

/** Extract stable per-message/status event identities from a Meta webhook payload. */
export function extractWhatsAppWebhookEvents(payload: unknown): WhatsAppWebhookEvent[] {
    const root = asRecord(payload);
    if (!root || root.object !== "whatsapp_business_account" || !Array.isArray(root.entry)) {
        throw new Error("INVALID_WHATSAPP_WEBHOOK_PAYLOAD");
    }

    const events: WhatsAppWebhookEvent[] = [];
    for (const entryValue of root.entry) {
        const entry = asRecord(entryValue);
        if (!entry || !Array.isArray(entry.changes)) continue;

        for (const changeValue of entry.changes) {
            const change = asRecord(changeValue);
            if (!change || change.field !== "messages") continue;

            const value = asRecord(change.value);
            if (!value) continue;

            const metadata = asRecord(value.metadata);
            const phoneNumberId = asString(metadata?.phone_number_id);
            const displayPhoneNumber = asString(metadata?.display_phone_number);
            if (!phoneNumberId) throw new Error("WHATSAPP_PHONE_NUMBER_ID_MISSING");

            if (Array.isArray(value.messages)) {
                for (const messageValue of value.messages) {
                    const message = asRecord(messageValue);
                    const messageId = asString(message?.id);
                    if (!message || !messageId) throw new Error("WHATSAPP_MESSAGE_ID_MISSING");
                    const sender = asString(message.from);
                    events.push({
                        providerEventId: "whatsapp:message:" + phoneNumberId + ":" + messageId,
                        type: "message.received",
                        externalId: messageId,
                        messageId,
                        sender,
                        recipient: displayPhoneNumber,
                        payload: { phoneNumberId, displayPhoneNumber, message },
                    });
                }
            }

            if (Array.isArray(value.statuses)) {
                for (const statusValue of value.statuses) {
                    const statusRecord = asRecord(statusValue);
                    const messageId = asString(statusRecord?.id);
                    const status = asString(statusRecord?.status);
                    const timestamp = asString(statusRecord?.timestamp);
                    const recipientId = asString(statusRecord?.recipient_id) || "";
                    if (!statusRecord || !messageId || !status || !timestamp) {
                        throw new Error("WHATSAPP_STATUS_METADATA_MISSING");
                    }
                    events.push({
                        providerEventId: stableStatusEventId(
                            phoneNumberId,
                            messageId,
                            status,
                            timestamp,
                            recipientId,
                        ),
                        type: "message.status." + status,
                        externalId: messageId,
                        messageId,
                        recipient: recipientId || undefined,
                        payload: { phoneNumberId, displayPhoneNumber, status: statusRecord },
                    });
                }
            }
        }
    }

    return events;
}

/**
 * Persist each provider event independently. A duplicate unique providerEventId
 * is an acknowledged replay; other database failures remain retryable HTTP 500s.
 * Events are SYSTEM-scoped until a reviewed phone-number-to-tenant resolver exists.
 */
export async function persistWhatsAppWebhookPayload(payload: unknown): Promise<{
    received: number;
    inserted: number;
    duplicates: number;
}> {
    const events = extractWhatsAppWebhookEvents(payload);
    let inserted = 0;
    let duplicates = 0;

    for (const event of events) {
        try {
            await prisma.communicationEvent.create({
                data: {
                    ownershipScope: "SYSTEM",
                    companyId: null,
                    spaceId: null,
                    provider: "whatsapp",
                    providerEventId: event.providerEventId,
                    type: event.type,
                    externalId: event.externalId,
                    messageId: event.messageId,
                    sender: event.sender,
                    recipient: event.recipient,
                    payload: event.payload as Prisma.InputJsonValue,
                },
            });
            inserted += 1;
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                duplicates += 1;
                continue;
            }
            throw error;
        }
    }

    return { received: events.length, inserted, duplicates };
}

function queryString(value: unknown): string | undefined {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[0] === "string") return value[0];
    return undefined;
}

router.get("/", (request: Request, response: Response) => {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN;
    if (!verifyToken) {
        return response.status(503).json({ error: "WHATSAPP_WEBHOOK_VERIFY_TOKEN_NOT_CONFIGURED" });
    }

    const mode = queryString(request.query["hub.mode"]);
    const token = queryString(request.query["hub.verify_token"]);
    const challenge = queryString(request.query["hub.challenge"]);

    if (mode !== "subscribe" || !token || !challenge || !safeStringEqual(token, verifyToken)) {
        return response.status(403).json({ error: "WHATSAPP_WEBHOOK_VERIFICATION_FAILED" });
    }

    return response.status(200).type("text/plain").send(challenge);
});

router.post("/", async (request: Request, response: Response) => {
    const appSecret = process.env.WHATSAPP_APP_SECRET;
    if (!appSecret) {
        return response.status(503).json({ error: "WHATSAPP_APP_SECRET_NOT_CONFIGURED" });
    }

    const rawBody = Buffer.isBuffer(request.body) ? request.body.toString("utf8") : "";
    if (!rawBody) {
        return response.status(400).json({ error: "RAW_WEBHOOK_BODY_REQUIRED" });
    }

    if (!verifyWhatsAppWebhookSignature(
        rawBody,
        request.header("x-hub-signature-256"),
        appSecret,
    )) {
        return response.status(401).json({ error: "INVALID_WHATSAPP_WEBHOOK_SIGNATURE" });
    }

    let payload: unknown;
    try {
        payload = JSON.parse(rawBody) as unknown;
    } catch {
        return response.status(400).json({ error: "INVALID_WEBHOOK_JSON" });
    }

    try {
        const result = await persistWhatsAppWebhookPayload(payload);
        return response.status(200).json({ received: true, ...result });
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (message.startsWith("INVALID_WHATSAPP_WEBHOOK_PAYLOAD") ||
            message.startsWith("WHATSAPP_PHONE_NUMBER_ID_MISSING") ||
            message.startsWith("WHATSAPP_MESSAGE_ID_MISSING") ||
            message.startsWith("WHATSAPP_STATUS_METADATA_MISSING")) {
            return response.status(400).json({ error: message });
        }
        console.error("Failed to persist WhatsApp webhook event:", error);
        return response.status(500).json({ error: "WHATSAPP_WEBHOOK_PERSISTENCE_FAILED" });
    }
});

export const whatsappWebhookRouter = router;
