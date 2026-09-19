import "dotenv/config";

import { prisma } from "../../../shared/database/client.js";

import {
    communicationRouter,
} from "../../../shared/communication/router.js";

import {
    registerCommunicationProviders,
} from "../../../shared/communication/providers.js";

import type { AgentResult } from "../../../shared/agents/interface.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import { Priority } from "../../task/priority.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
    type ProductionActuator,
} from "../production-actuator.js";

const recipient =
    process.env.LUUKU_TEST_CONTACT_EMAIL ||
    process.env.EMAIL_TEST_RECIPIENT;

const controlledContactId = "5cf97e46-2eec-4d92-985f-df8a69827367";

const requiredEnvironment = [
    "RESEND_API_KEY",
    "RESEND_FROM_EMAIL",
    "LUUKU_LIVE_EMAIL_CONFIRMATION",
];

for (const name of requiredEnvironment) {
    if (!process.env[name]) {
        throw new Error(
            `Controlled real-email test requires ${name} in the local environment.`,
        );
    }
}

if (!recipient) {
    throw new Error(
        "Controlled real-email test requires LUUKU_TEST_CONTACT_EMAIL or EMAIL_TEST_RECIPIENT.",
    );
}

if (
    process.env.LUUKU_LIVE_EMAIL_CONFIRMATION !==
    "SEND_TO_CONTROLLED_TEST_CONTACT"
) {
    throw new Error(
        "Controlled real-email test requires LUUKU_LIVE_EMAIL_CONFIRMATION=SEND_TO_CONTROLLED_TEST_CONTACT.",
    );
}

async function main(): Promise<void> {
    const contact = await prisma.contact.findUnique({
        where: {
            id: controlledContactId,
        },
        select: {
            id: true,
            email: true,
            name: true,
            verified: true,
            confidence: true,
            source: true,
        },
    });

    if (!contact) {
        throw new Error(
            `Controlled CRM contact ${controlledContactId} does not exist. Refusing real-email execution.`,
        );
    }

    if (!contact.email || contact.email.toLowerCase() !== recipient.toLowerCase()) {
        throw new Error(
            `Controlled CRM contact ${controlledContactId} email does not match the configured recipient ${recipient}. Refusing real-email execution.`,
        );
    }

    if (!contact.verified || contact.confidence !== 100) {
        throw new Error(
            `Controlled CRM contact ${controlledContactId} is not fully verified. Refusing real-email execution.`,
        );
    }

    if (contact.source !== "Luuku AI Controlled Test Fixture") {
        throw new Error(
            `Controlled CRM contact ${controlledContactId} is not the expected Luuku AI test fixture. Refusing real-email execution.`,
        );
    }

    const crmContactId = contact.id;

    registerCommunicationProviders();

    const emailActuator: ProductionActuator = {
        id: "resend-controlled-email",
        capabilities: ["email.send"],
        async execute(authorizedStep): Promise<AgentResult> {
            const input =
                typeof authorizedStep.input === "object" &&
                authorizedStep.input !== null
                    ? authorizedStep.input as Record<string, unknown>
                    : {};

            const subject =
                typeof input.subject === "string"
                    ? input.subject
                    : "Luuku AI — Controlled V6 Actuation Test";

            const body =
                typeof input.body === "string"
                    ? input.body
                    : "This is a controlled real-email actuation test from Luuku AI.";

            const result = await communicationRouter.execute({
                capability: "email.send",
                channel: "email",
                recipientExternalId: recipient,
                subject,
                body,
                metadata: {
                    audience: "external",
                    executionMode: "live",
                    source: "v8-real-email-actuation-demo",
                    taskId: authorizedStep.id,
                    crmContactId,
                    requesterAgentId: "sales",
                    target: "external",
                    idempotencyKey: `v8-real-email/${authorizedStep.workflowId}/${authorizedStep.id}`,
                },
            });

            return {
                success: result.verified,
                summary: result.summary,
                completedAt: new Date().toISOString(),
                executionStatus: result.status,
                executed: result.executed,
                verified: result.verified,
                evidence: result.evidence,
                blockers: result.error ? [result.error] : undefined,
            };
        },
    };

    const step: WorkflowStep = {
        id: "v8-real-email-test",
        workflowId: "v8-real-email-actuation-workflow",
        title: "Send controlled real email",
        description:
            "Send one controlled test email through the V8 production actuator and V6 execution boundary.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
        input: {
            subject: "Luuku AI — Controlled V6 Actuation Test",
            body:
                "This is a controlled real-email actuation test from Luuku AI. " +
                "It verifies the V8 production actuator → V6 execution boundary → communication router → Resend path.",
        },
    };

    const registry = new InMemoryProductionActuatorRegistry();
    registry.register(emailActuator);

    const composition = new ProductionActuatorComposition(registry);
    const result = await composition.dispatch(step);

    if (!result.allowed) {
        throw new Error(
            `V6 blocked the controlled real-email test: ${result.reason ?? "unknown reason"}`,
        );
    }

    if (result.boundary !== "V6_EXECUTION_AUTHORITY") {
        throw new Error("Real email execution did not cross the V6 boundary.");
    }

    if (!result.result?.executed || !result.result.verified) {
        throw new Error(
            `Provider did not return verified execution evidence: ${result.result?.summary ?? "unknown result"}`,
        );
    }

    if (result.result.executionStatus !== "verified") {
        throw new Error("Real email execution did not reach verified status.");
    }

    console.log("");
    console.log("V8 — CONTROLLED REAL EMAIL ACTUATION");
    console.log("Recipient                :", recipient);
    console.log("CRM contact              :", contact.name ?? contact.id);
    console.log("Actuator                 :", result.actuatorId);
    console.log("V6 boundary             :", result.boundary);
    console.log("Execution status         :", result.result.executionStatus);
    console.log("Executed                 :", result.result.executed ? "YES" : "NO");
    console.log("Verified                 :", result.result.verified ? "YES" : "NO");
    console.log("Provider evidence        :", result.result.evidence ?? "none");
    console.log("Execution summary        :", result.result.summary);
    console.log("");
    console.log("✓ Explicit CRM test fixture was selected");
    console.log("✓ CRM identity matched the configured recipient");
    console.log("✓ CRM identity was verified at confidence 100");
    console.log("✓ External email was explicitly restricted to the configured test contact");
    console.log("✓ Explicit live confirmation was required");
    console.log("✓ Production actuator crossed the V6 execution boundary");
    console.log("✓ Communication Router handled provider execution");
    console.log("✓ Resend provider returned verified execution evidence");
    console.log("V8 REAL EMAIL ACTUATION: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
