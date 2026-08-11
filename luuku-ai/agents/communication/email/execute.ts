import crypto from "crypto";

import {
    AgentTask,
    AgentResult
} from "../../../shared/agents/interface";

import {
    communicationRouter
} from "../../../shared/communication/router";

import {
    registerCommunicationProviders
} from "../../../shared/communication/providers";

import {
    buildCommunicationBrief
} from "../../../shared/communication/brief";

import {
    FollowUpObjective
} from "../../../shared/context/objectives";

import {
    activityService
} from "../../../shared/database/services/activity.service";

import {
    companyService
} from "../../../shared/database/services/company.service";

import {
    dealService
} from "../../../shared/database/services/deal.service";

import {
    Activity
} from "../../../shared/domain/activity";

import {
    Contact
} from "../../../shared/crm/types";

function buildEmailSubject(
    company: string
): string {
    return `Luuku AI — Follow-up with ${company}`;
}

function buildEmailBody(
    contact: Contact
): string {
    const brief =
        buildCommunicationBrief(
            contact,
            FollowUpObjective
        );

    return [
        `Hello ${brief.contactName},`,
        "",
        `I’m reaching out from Luuku AI regarding ${brief.objective.toLowerCase()}.`,
        "",
        brief.desiredOutcome,
        "",
        "I’d be glad to understand your current workflow and explore whether Luuku AI could help automate part of it.",
        "",
        "Would you be open to a short conversation?",
        "",
        "Best regards,",
        "Luuku AI"
    ].join("\n");
}

export async function executeEmailTask(
    task: AgentTask,
    contact: Contact
): Promise<AgentResult> {
    if (!contact.email) {
        return {
            success: false,
            summary: "Sales email workflow stopped because the CRM contact has no email address.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false
        };
    }

    const company =
        await companyService.findCompany(
            contact.company
        );

    if (!company) {
        return {
            success: false,
            summary: `Sales email workflow stopped because company ${contact.company} could not be resolved in PostgreSQL.`,
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false
        };
    }

    registerCommunicationProviders();

    const subject =
        buildEmailSubject(contact.company);

    const body =
        buildEmailBody(contact);

    const idempotencyKey =
        `sales-email/${task.id}`;

    console.log("");
    console.log("========================================");
    console.log("       REAL EMAIL EXECUTION");
    console.log("========================================");
    console.log("");
    console.log(`To      : ${contact.email}`);
    console.log(`Subject : ${subject}`);
    console.log(`Request : ${idempotencyKey}`);
    console.log("");

    const result =
        await communicationRouter.execute({
            capability: "email.send",
            channel: "email",
            recipientExternalId: contact.email,
            subject,
            body,
            metadata: {
                source: "sales-agent",
                taskId: task.id,
                idempotencyKey,
                replyTo: process.env.RESEND_REPLY_TO || ""
            }
        });

    console.log("");
    console.log("Email execution result:");
    console.log(result);

    if (!result.verified) {
        console.log("");
        console.log("========================================");
        console.log("      CRM ACTIVITY NOT LOGGED");
        console.log("========================================");
        console.log("");
        console.log("Reason: Email was not verified as a real external execution.");
        console.log(`Status: ${result.status} | executed=${result.executed} | verified=${result.verified}`);

        return {
            success: false,
            summary: result.summary,
            completedAt: new Date().toISOString(),
            executionStatus: result.status,
            executed: result.executed,
            verified: result.verified
        };
    }

    const deals =
        await dealService.getCompanyDeals(
            company.id
        );

    const activeDeal = deals[0];
    const providerEvidence = result.evidence;
    const externalId = providerEvidence?.externalId;
    const provider = providerEvidence?.provider;

    const activity: Activity = {
        id: crypto.randomUUID(),
        companyId: company.id,
        contactId: contact.id,
        dealId: activeDeal?.id,
        type: "email",
        title: "Sales Follow-up Email",
        description: [
            result.summary,
            provider && externalId
                ? `Provider: ${provider}; externalId: ${externalId}; idempotencyKey: ${idempotencyKey}.`
                : `IdempotencyKey: ${idempotencyKey}.`
        ].join(" "),
        outcome: "Sent",
        createdBy: "Sales Agent",
        completed: true,
        createdAt: new Date().toISOString()
    };

    await activityService.createActivity(activity);

    console.log("");
    console.log("========================================");
    console.log("      VERIFIED EMAIL LOGGED");
    console.log("========================================");
    console.log("");
    console.log(activity);

    return {
        success: true,
        summary: `Sales Agent sent and verified the follow-up email to ${contact.email}. ${result.summary}`,
        completedAt: new Date().toISOString(),
        executionStatus: "verified",
        executed: true,
        verified: true
    };
}
