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

interface InboundReplyData {
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
    from?: string;
}

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

function extractInboundReply(
    task: AgentTask
): InboundReplyData | undefined {
    if (!/^INBOUND_REPLY=true$/im.test(task.description)) {
        return undefined;
    }

    const subject =
        task.description.match(
            /^ORIGINAL_SUBJECT:\s*(.+)$/im
        )?.[1]?.trim();

    const inReplyTo =
        task.description.match(
            /^IN_REPLY_TO:\s*(.+)$/im
        )?.[1]?.trim();

    const references =
        task.description.match(
            /^REFERENCES:\s*(.+)$/im
        )?.[1]?.trim();

    const from =
        task.description.match(
            /^CONTACT_EMAIL:\s*(.+)$/im
        )?.[1]?.trim();

    const bodyMatch = task.description.match(
        /REPLY_BODY_START\s*\n([\s\S]*?)\nREPLY_BODY_END/i
    );

    const body = bodyMatch?.[1]?.trim();

    if (!body) {
        return undefined;
    }

    return {
        subject: subject
            ? /^re:/i.test(subject)
                ? subject
                : `Re: ${subject}`
            : "Re: Luuku AI",
        body,
        inReplyTo: inReplyTo || undefined,
        references: references || undefined,
        from: from || undefined
    };
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

    const inboundReply =
        extractInboundReply(task);

    const subject =
        inboundReply?.subject ||
        buildEmailSubject(contact.company);

    const body =
        inboundReply?.body ||
        buildEmailBody(contact);

    const recipient =
        inboundReply?.from || contact.email;

    const idempotencyKey =
        `sales-email/${task.id}`;

    console.log("");
    console.log("========================================");
    console.log(
        inboundReply
            ? "       REAL EMAIL REPLY EXECUTION"
            : "       REAL EMAIL EXECUTION"
    );
    console.log("========================================");
    console.log("");
    console.log(`To      : ${recipient}`);
    console.log(`Subject : ${subject}`);
    console.log(`Request : ${idempotencyKey}`);
    console.log("");

    const result =
        await communicationRouter.execute({
            capability: "email.send",
            channel: "email",
            recipientExternalId: recipient,
            subject,
            body,
            metadata: {
                source: inboundReply
                    ? "sales-agent-inbound-reply"
                    : "sales-agent",
                taskId: task.id,
                idempotencyKey,
                replyTo: process.env.RESEND_REPLY_TO || "",
                ...(inboundReply?.inReplyTo
                    ? { inReplyTo: inboundReply.inReplyTo }
                    : {}),
                ...(inboundReply?.references
                    ? { references: inboundReply.references }
                    : {})
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
        title: inboundReply
            ? "Sales Agent Reply to Inbound Email"
            : "Sales Follow-up Email",
        description: [
            result.summary,
            inboundReply
                ? "Triggered by AI-classified inbound prospect reply."
                : "",
            provider && externalId
                ? `Provider: ${provider}; externalId: ${externalId}; idempotencyKey: ${idempotencyKey}.`
                : `IdempotencyKey: ${idempotencyKey}.`
        ].filter(Boolean).join(" "),
        outcome: inboundReply
            ? "Reply sent and verified"
            : "Sent",
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
        summary: inboundReply
            ? `Sales Agent sent and verified an inbound-reply response to ${recipient}. ${result.summary}`
            : `Sales Agent sent and verified the follow-up email to ${recipient}. ${result.summary}`,
        completedAt: new Date().toISOString(),
        executionStatus: "verified",
        executed: true,
        verified: true
    };
}
