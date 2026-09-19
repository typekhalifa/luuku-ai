import "dotenv/config";

import { prisma } from "../../../shared/database/client.js";

import {
    communicationRouter
} from "../../../shared/communication/router.js";

import {
    registerCommunicationProviders
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

const contacts = await prisma.contact.findMany({
    where: {
        email: {
            equals: recipient,
            mode: "insensitive",
        },
    },
    select: {
        id: true,
        email: true,
    },
});

if (contacts.length !== 1) {
    throw new Error(
        contacts.length === 0
            ? `Controlled recipient ${recipient} is not present as a unique CRM contact. Create/verify the test contact first.`
            : `Controlled recipient ${recipient} matches ${contacts.length} CRM contacts; refusing ambiguous execution.`,
    );
}

const crmContactId = contacts[0].id;

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
            "It verifies the production actuator → V6 boundary → communication router → Resend path.",
    },
};

async function main(): Promise<void> {
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
    console.log("Actuator                 :", result.actuatorId);
    console.log("V6 boundary             :", result.boundary);
    console.log("Execution status        :", result.result.executionStatus);
    console.log("Executed                :", result.result.executed ? "YES" : "NO");
    console.log("Verified                :", result.result.verified ? "YES" : "NO");
    console.log("Provider evidence       :", result.result.evidence ?? "none");
    console.log("Execution summary      :", result.result.summary);
    console.log("");
    console.log("✓ External email was explicitly restricted to the configured test contact");
    console.log("✓ Explicit live confirmation was required");
    console.log("✓ Production actuator crossed the V6 execution boundary");
    console.log("✓ Communication Router handled provider execution");
    console.log("✓ Resend provider returned verified execution evidence");
    console.log("V8 REAL EMAIL ACTUATION: PASS");
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
