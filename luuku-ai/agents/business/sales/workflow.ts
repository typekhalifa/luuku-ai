import {
    AgentTask,
    AgentResult
} from "../../../shared/agents/interface";

import {
    executeVoiceTask
} from "../../communication/voice/execute";

import {
    executeEmailTask
} from "../../communication/email/execute";

import {
    resolveTaskContext
} from "../../../shared/context/resolver";

import {
    resolveContact
} from "../../../shared/crm/resolver";

import {
    validateContact
} from "../../../shared/crm/validator";

import {
    requestContactEnrichment
} from "../../../shared/crm/enrichment";

function extractContactEmail(
    text: string
): string | undefined {
    const match = text.match(
        /CONTACT_EMAIL:\s*([^\s\n\r]+)/i
    );

    return match?.[1]?.trim() || undefined;
}

function extractTestContactCompany(
    text: string
): string | undefined {
    const match = text.match(
        /TEST_CONTACT_COMPANY:\s*([^\n\r]+)/i
    );

    return match?.[1]?.trim() || undefined;
}

function isControlledTestTask(
    text: string
): boolean {
    return /TEST_CONTACT_COMPANY\s*:|CONTROLLED TEST CONTACT|test follow-up email/i.test(
        text
    );
}

export async function executeSalesWorkflow(

    task: AgentTask

): Promise<AgentResult> {

    console.log("");

    console.log("========================================");
    console.log("        SALES WORKFLOW");
    console.log("========================================");
    console.log("");

    const rawText =
        task.title +
        "\n" +
        task.description;

    const text = rawText.toLowerCase();

    const context =
        await resolveTaskContext(task);

    const preferredContactEmail =
        extractContactEmail(rawText);

    const controlledTest =
        isControlledTestTask(rawText);

    const isInboundEmailReply =
        /^INBOUND_REPLY=true$/im.test(task.description);

    const requiresEmail =
        isInboundEmailReply ||
        text.includes("email") ||
        text.includes("e-mail");

    const requiresVoice =
        text.includes("call") ||
        text.includes("phone") ||
        text.includes("meeting");

    const validationChannel =
        requiresEmail && !requiresVoice
            ? "email"
            : requiresVoice
                ? "voice"
                : undefined;

    // Controlled test actions carry their own exact CRM identity.
    // Never let a stale conversation/task context replace it with an
    // unrelated prospect or company.
    const requestedCompany =
        extractTestContactCompany(rawText) ||
        context.companyName;

    let activeContact =
        await resolveContact(
            requestedCompany,
            preferredContactEmail
        );

    // resolveContact historically falls back to the first company contact
    // when the preferred email is not found. That is acceptable for generic
    // sales work, but never safe for a controlled test action: the exact test
    // email must be the resolved CRM identity.
    if (
        controlledTest &&
        preferredContactEmail &&
        activeContact?.email?.toLowerCase() !==
            preferredContactEmail.toLowerCase()
    ) {
        activeContact = undefined;
    }

    if (!activeContact) {

        console.log("");
        console.log("========================================");
        console.log("      CRM VALIDATION");
        console.log("========================================");
        console.log("");
        console.log("Status : FAILED");
        console.log("");
        console.log("Reason:");
        console.log(
            controlledTest && preferredContactEmail
                ? `• Controlled test contact ${preferredContactEmail} was not found in PostgreSQL for company ${requestedCompany}.`
                : "• No contact found in PostgreSQL."
        );
        console.log("");

        // Never use web enrichment as a fallback for a controlled test.
        // That could create an unrelated real prospect and violate the test
        // recipient boundary.
        if (controlledTest) {
            return {
                success: false,
                summary:
                    `Controlled test stopped: CRM contact ${preferredContactEmail || ""} at ${requestedCompany} was not found. No enrichment or external communication was attempted.`,
                completedAt: new Date().toISOString(),
                executionStatus: "blocked",
                executed: false,
                verified: false
            };
        }

        const enrichment =
            await requestContactEnrichment({
                company: context.companyName,
                reasons: [
                    "No contact found in PostgreSQL."
                ]
            });

        if (!enrichment.success) {
            return {
                success: false,
                summary:
                    "Sales workflow could not enrich the missing CRM contact.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false
            };
        }

        activeContact = enrichment.contact;
    }

    let validation =
        validateContact(
            activeContact,
            validationChannel
        );

    console.log("");
    console.log("========================================");
    console.log("      CRM VALIDATION");
    console.log("========================================");
    console.log("");

    if (!validation.ready) {

        console.log("Status : FAILED");
        console.log("");
        console.log("Reasons:");

        for (const reason of validation.reasons) {
            console.log(`• ${reason}`);
        }

        console.log("");

        // A controlled test must never be enriched into a different
        // recipient merely because validation failed.
        if (controlledTest) {
            return {
                success: false,
                summary:
                    `Controlled test stopped because CRM validation for ${preferredContactEmail || requestedCompany} is incomplete. No enrichment or external communication was attempted.`,
                completedAt: new Date().toISOString(),
                executionStatus: "blocked",
                executed: false,
                verified: false
            };
        }

        const enrichment =
            await requestContactEnrichment({
                company: context.companyName,
                reasons: validation.reasons
            });

        if (!enrichment.success) {
            return {
                success: false,
                summary:
                    "Sales workflow could not complete CRM enrichment.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false
            };
        }

        activeContact = enrichment.contact;

        validation =
            validateContact(
                activeContact,
                validationChannel
            );

        if (!validation.ready) {
            console.log("");
            console.log("CRM enrichment failed.");

            return {
                success: false,
                summary:
                    "Sales workflow stopped because CRM validation is still incomplete.",
                completedAt: new Date().toISOString(),
                executionStatus: "failed",
                executed: false,
                verified: false
            };
        }

        console.log("");
        console.log("✓ CRM successfully enriched.");
    }

    console.log("Status : PASSED");
    console.log("");
    console.log("CRM ready for communication.");
    console.log("");

    if (isInboundEmailReply) {
        console.log("✓ Inbound email reply — email channel required");
        console.log("");

        return executeEmailTask(
            task,
            activeContact
        );
    }

    if (requiresEmail && !requiresVoice) {
        console.log("✓ Real email communication required");
        console.log("");

        return executeEmailTask(
            task,
            activeContact
        );
    }

    if (requiresVoice) {
        console.log("✓ Communication required");
        console.log("");

        return executeVoiceTask(
            task,
            activeContact
        );
    }

    console.log("✓ No communication required");

    return {
        success: true,
        summary:
            `Sales CRM workflow completed "${task.title}". No external communication was required.`,
        completedAt: new Date().toISOString(),
        executionStatus: "completed",
        executed: true,
        verified: false
    };

}
