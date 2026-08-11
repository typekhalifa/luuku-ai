import crypto from "crypto";
import { Router, Request, Response } from "express";
import { Prisma } from "@prisma/client";

import { prisma } from "../../database/client";

const router = Router();

const MAX_WEBHOOK_AGE_SECONDS = 300;

function headerValue(
    request: Request,
    name: string
): string | undefined {
    const value = request.header(name);

    return value || undefined;
}

function verifyResendSignature(
    payload: string,
    request: Request
): boolean {
    const secret = process.env.RESEND_WEBHOOK_SECRET;

    if (!secret) {
        return false;
    }

    const id =
        headerValue(request, "svix-id");

    const timestamp =
        headerValue(request, "svix-timestamp");

    const signatures =
        headerValue(request, "svix-signature");

    if (!id || !timestamp || !signatures) {
        return false;
    }

    const timestampSeconds =
        Number(timestamp);

    if (!Number.isFinite(timestampSeconds)) {
        return false;
    }

    const age =
        Math.abs(
            Math.floor(Date.now() / 1000) -
            timestampSeconds
        );

    if (age > MAX_WEBHOOK_AGE_SECONDS) {
        return false;
    }

    const encodedSecret = secret.startsWith("whsec_")
        ? secret.slice("whsec_".length)
        : secret;

    let secretBytes: Buffer;

    try {
        secretBytes = Buffer.from(
            encodedSecret,
            "base64"
        );
    } catch {
        return false;
    }

    const signedContent =
        `${id}.${timestamp}.${payload}`;

    const expected =
        crypto
            .createHmac("sha256", secretBytes)
            .update(signedContent)
            .digest("base64");

    return signatures
        .split(" ")
        .some((signature) => {
            const [version, value] =
                signature.split(",", 2);

            if (version !== "v1" || !value) {
                return false;
            }

            const expectedBuffer =
                Buffer.from(expected);

            const receivedBuffer =
                Buffer.from(value);

            return (
                expectedBuffer.length === receivedBuffer.length &&
                crypto.timingSafeEqual(
                    expectedBuffer,
                    receivedBuffer
                )
            );
        });
}

router.post(
    "/",
    async (request: Request, response: Response) => {
        const rawBody =
            Buffer.isBuffer(request.body)
                ? request.body.toString("utf8")
                : "";

        if (!rawBody) {
            return response
                .status(400)
                .json({
                    error: "RAW_WEBHOOK_BODY_REQUIRED"
                });
        }

        if (!verifyResendSignature(rawBody, request)) {
            return response
                .status(401)
                .json({
                    error: "INVALID_RESEND_WEBHOOK_SIGNATURE"
                });
        }

        let event: {
            type?: string;
            created_at?: string;
            data?: {
                email_id?: string;
                message_id?: string;
                from?: string;
                to?: string[];
                subject?: string;
                [key: string]: unknown;
            };
        };

        try {
            event = JSON.parse(rawBody) as typeof event;
        } catch {
            return response
                .status(400)
                .json({
                    error: "INVALID_WEBHOOK_JSON"
                });
        }

        const providerEventId =
            headerValue(request, "svix-id");

        if (!providerEventId || !event.type) {
            return response
                .status(400)
                .json({
                    error: "WEBHOOK_EVENT_METADATA_MISSING"
                });
        }

        const data = event.data || {};
        const recipients = Array.isArray(data.to)
            ? data.to
            : [];

        try {
            await prisma.communicationEvent.create({
                data: {
                    provider: "resend",
                    providerEventId,
                    type: event.type,
                    externalId: data.email_id,
                    messageId: data.message_id,
                    recipient: recipients[0],
                    sender: data.from,
                    subject: data.subject,
                    payload: event as Prisma.InputJsonValue
                }
            });

            console.log(
                `[Resend webhook] ${event.type} ${data.email_id || ""}`
            );
        } catch (error) {
            if (
                error instanceof Prisma.PrismaClientKnownRequestError &&
                error.code === "P2002"
            ) {
                return response
                    .status(200)
                    .json({
                        received: true,
                        duplicate: true
                    });
            }

            console.error(
                "Failed to persist Resend webhook event:",
                error
            );

            return response
                .status(500)
                .json({
                    error: "WEBHOOK_PERSISTENCE_FAILED"
                });
        }

        return response
            .status(200)
            .json({
                received: true,
                duplicate: false,
                type: event.type
            });
    }
);

export const resendWebhookRouter = router;
