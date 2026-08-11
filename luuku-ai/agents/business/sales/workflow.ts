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

export async function executeSalesWorkflow(

    task: AgentTask

): Promise<AgentResult> {

    console.log("");

    console.log("========================================");

    console.log("        SALES WORKFLOW");

    console.log("========================================");

    console.log("");

    const text = (

        task.title +

        " " +

        task.description

    ).toLowerCase();

    const context =
        resolveTaskContext(task);

    let activeContact =
        await resolveContact(
            context.companyName
        );

    if (!activeContact) {

        console.log("");

        console.log("========================================");

        console.log("      CRM VALIDATION");

        console.log("========================================");

        console.log("");

        console.log("Status : FAILED");

        console.log("");

        console.log("Reason:");

        console.log("• No contact found in PostgreSQL.");

        console.log("");

        const enrichment =
            await requestContactEnrichment({

                company:
                    context.companyName,

                reasons: [
                    "No contact found in PostgreSQL."
                ]

            });

        if (!enrichment.success) {

            return {

                success: false,

                summary:
                    "Sales workflow could not enrich the missing CRM contact.",

                completedAt:
                    new Date().toISOString(),

                executionStatus:
                    "failed",

                executed:
                    false,

                verified:
                    false

            };

        }

        activeContact =
            enrichment.contact;

    }

    let validation =
        validateContact(
            activeContact
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

        const enrichment =
            await requestContactEnrichment({

                company:
                    context.companyName,

                reasons:
                    validation.reasons

            });

        if (!enrichment.success) {

            return {

                success: false,

                summary:
                    "Sales workflow could not complete CRM enrichment.",

                completedAt:
                    new Date().toISOString(),

                executionStatus:
                    "failed",

                executed:
                    false,

                verified:
                    false

            };

        }

        activeContact =
            enrichment.contact;

        validation =
            validateContact(
                activeContact
            );

        if (!validation.ready) {

            console.log("");

            console.log(
                "CRM enrichment failed."
            );

            return {

                success: false,

                summary:
                    "Sales workflow stopped because CRM validation is still incomplete.",

                completedAt:
                    new Date().toISOString(),

                executionStatus:
                    "failed",

                executed:
                    false,

                verified:
                    false

            };

        }

        console.log("");

        console.log(
            "✓ CRM successfully enriched."
        );

    }

    console.log("Status : PASSED");

    console.log("");

    console.log(
        "CRM ready for communication."
    );

    console.log("");

    const requiresEmail =
        text.includes("email") ||
        text.includes("e-mail");

    const requiresVoice =
        text.includes("call") ||
        text.includes("phone") ||
        text.includes("meeting");

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

        completedAt:
            new Date().toISOString(),

        executionStatus:
            "completed",

        executed:
            true,

        verified:
            false

    };

}
