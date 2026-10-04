import { prisma } from "../../database/client";
import { registerCommunicationProviders } from "../providers";
import { communicationRouter } from "../router";
import type { CommunicationRequest } from "../types";

const LIVE_GATE = "SEND_ONE_REAL_EMAIL";

function required(name: string): string {
    const value = process.env[name]?.trim();

    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }

    return value;
}

function assertEqual<T>(label: string, actual: T, expected: T): void {
    if (actual !== expected) {
        throw new Error(
            `${label}: expected ${String(expected)}, got ${String(actual)}`,
        );
    }
}

async function main(): Promise<void> {
    /*
     * This is intentionally NOT a CI test.
     *
     * It makes exactly one real provider request when every independent
     * safety gate below is satisfied. The same request is then replayed with
     * the same durable idempotency key to prove that the provider is not
     * invoked a second time.
     */
    assertEqual(
        "Phase 5 live gate",
        process.env.LUUKU_PHASE5_LIVE_EMAIL_CONFIRMATION,
        LIVE_GATE,
    );

    assertEqual(
        "EMAIL_MODE",
        process.env.EMAIL_MODE,
        "live",
    );

    assertEqual(
        "Provider live confirmation",
        process.env.LUUKU_LIVE_EMAIL_CONFIRMATION,
        "SEND_TO_CONTROLLED_TEST_CONTACT",
    );

    required("RESEND_API_KEY");
    required("RESEND_FROM_EMAIL");

    const controlledRecipient =
        process.env.EMAIL_TEST_RECIPIENT?.trim() ||
        process.env.LUUKU_TEST_CONTACT_EMAIL?.trim();

    if (!controlledRecipient) {
        throw new Error(
            "Set EMAIL_TEST_RECIPIENT or LUUKU_TEST_CONTACT_EMAIL to the controlled test inbox.",
        );
    }

    const companyId = required("LUUKU_PHASE5_LIVE_EMAIL_COMPANY_ID");
    const contactId = required("LUUKU_PHASE5_LIVE_EMAIL_CONTACT_ID");

    const contact = await prisma.contact.findFirst({
        where: {
            id: contactId,
            companyId,
        },
        select: {
            id: true,
            companyId: true,
            name: true,
            email: true,
            verified: true,
        },
    });

    if (!contact) {
        throw new Error(
            "Controlled CRM contact was not found inside the requested tenant.",
        );
    }

    if (!contact.email) {
        throw new Error(
            "Controlled CRM contact has no email address.",
        );
    }

    if (!contact.verified) {
        throw new Error(
            "Controlled CRM contact is not marked verified.",
        );
    }

    if (
        contact.email.trim().toLowerCase() !==
        controlledRecipient.toLowerCase()
    ) {
        throw new Error(
            "Controlled CRM contact email does not match the configured test recipient.",
        );
    }

    registerCommunicationProviders();

    const idempotencyKey =
        `phase5/live-email/${companyId}/${contactId}/${Date.now()}`;

    const request: CommunicationRequest = {
        capability: "email.send",
        channel: "email",
        recipientExternalId: contact.email,
        target: "external",
        subject: "Luuku AI — Phase 5 controlled live email",
        body:
            "This is the controlled Phase 5 real-email E2E test for Luuku AI. " +
            "It validates governed external execution, CRM identity resolution, " +
            "provider evidence, and durable idempotent replay protection.",
        metadata: {
            audience: "external",
            executionMode: "live",
            companyId,
            crmContactId: contactId,
            idempotencyKey,
            taskId: `phase5-controlled-real-email-${Date.now()}`,
            source: "phase5-controlled-real-email-e2e",
        },
    };

    const first = await communicationRouter.execute(request);

    assertEqual("First execution status", first.status, "verified");
    assertEqual("First execution executed", first.executed, true);
    assertEqual("First execution verified", first.verified, true);

    const firstExternalId = first.evidence?.externalId;

    if (!firstExternalId) {
        throw new Error(
            "Provider accepted the email but no external provider ID was recorded.",
        );
    }

    const firstLedger =
        await prisma.communicationExecution.findUnique({
            where: { idempotencyKey },
        });

    if (!firstLedger) {
        throw new Error(
            "Durable communication execution ledger record was not created.",
        );
    }

    assertEqual("Ledger company", firstLedger.companyId, companyId);
    assertEqual("Ledger status", firstLedger.status, "verified");
    assertEqual("Ledger executed", firstLedger.executed, true);
    assertEqual("Ledger verified", firstLedger.verified, true);
    assertEqual("Ledger provider", firstLedger.provider, "resend");
    assertEqual("Ledger external ID", firstLedger.externalId, firstExternalId);

    const second =
        await communicationRouter.execute(request);

    assertEqual("Replay status", second.status, "verified");
    assertEqual("Replay executed", second.executed, true);
    assertEqual("Replay verified", second.verified, true);
    assertEqual(
        "Replay external ID",
        second.evidence?.externalId,
        firstExternalId,
    );

    const secondLedger =
        await prisma.communicationExecution.findUnique({
            where: { idempotencyKey },
        });

    if (!secondLedger) {
        throw new Error(
            "Durable execution ledger disappeared after replay.",
        );
    }

    assertEqual(
        "Replay ledger external ID",
        secondLedger.externalId,
        firstExternalId,
    );

    console.log("");
    console.log("========================================");
    console.log("   PHASE 5.3 CONTROLLED REAL EMAIL E2E");
    console.log("========================================");
    console.log("");
    console.log("Live gate                    : PASS");
    console.log("Provider live mode           : PASS");
    console.log("Tenant-scoped CRM contact   : PASS");
    console.log("Recipient allowlist          : PASS");
    console.log("Communication policy         : PASS");
    console.log("Resend provider execution    : PASS");
    console.log("Provider external ID         :", firstExternalId);
    console.log("Durable execution ledger     : PASS");
    console.log("Idempotent replay            : BLOCKED");
    console.log("Replay external ID preserved :", second.evidence?.externalId);
    console.log("");
    console.log("PHASE 5.3 CONTROLLED REAL EMAIL E2E: PASS");
    console.log("");
}

main()
    .catch((error) => {
        console.error("Phase 5.3 controlled real email failed:", error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
