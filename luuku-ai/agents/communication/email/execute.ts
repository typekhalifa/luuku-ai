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

import {
    getOrCreateEmailConversation
} from "../../../shared/communication/persistent-communication.service";

import {
    prismaCommunicationService
} from "../../../shared/communication/prisma-communication-service";

interface InboundReplyData {
    subject: string;
    body: string;
    inReplyTo?: string;
    references?: string;
    from?: string;
    conversationId?: string;
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

    const conversationId =
        task.description.match(
            /^CONVERSATION_ID:\s*(.+)$/im
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
        from: from || undefined,
        conversationId: conversationId || undefined
    };
}

export async function executeEmailTask(
    task: AgentTask,
    contact: Contact
): Promise<AgentResult> {
    if (!contact.email) {
        return {
            success: false,
            summary:
                "Sales email workflow stopped because the CRM contact has no email address.",
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
            summary:
                `Sales email workflow stopped because company ${contact.company} could not be resolved in PostgreSQL.`,
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
        inboundReply?.from ||
        contact.email;

    const idempotencyKey =
        `sales-email/${task.id}`;

    const isControlledTest =
        task.description.includes("CONTROLLED_TEST_EMAIL=true");

    const controlledTestConfirmed =
        process.env.LUUKU_LIVE_EMAIL_CONFIRMATION ===
        "SEND_TO_CONTROLLED_TEST_CONTACT";

    const executionMode =
        isControlledTest && controlledTestConfirmed
            ? "live"
            : process.env.EMAIL_MODE === "live"
                ? "live"
                : process.env.EMAIL_MODE === "sandbox"
                    ? "sandbox"
                    : "test";

    console.log("");
    console.log("========================================");
    console.log(
        inboundReply
            ? "       EMAIL REPLY EXECUTION"
            : "       EMAIL EXECUTION"
    );
    console.log("========================================");
    console.log("");
    console.log(`Mode    : ${executionMode}`);
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
                audience: "external",
                // A controlled test may use the real provider only when the
                // task explicitly marks itself as a controlled test and the
                // operator has supplied the exact opt-in confirmation phrase.
                executionMode,
                crmContactId: contact.id,
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
        console.log(
            "Reason: Email was not verified as a real external execution."
        );
        console.log(
            `Status: ${result.status} | executed=${result.executed} | verified=${result.verified}`
        );

        return {
            success: false,
            summary: result.summary,
            completedAt: new Date().toISOString(),
            executionStatus: result.status,
            executed: result.executed,
            verified: result.verified
        };
    }

    let conversationId =
        inboundReply?.conversationId;

    if (!conversationId) {
        const conversation =
            await getOrCreateEmailConversation({
                participantEmail: recipient,
                subject,
                metadata: {
                    source: inboundReply
                        ? "sales-agent-inbound-reply"
                        : "sales-agent",
                    taskId: task.id
                }
            });

        conversationId = conversation.id;
    }

    const providerEvidence = result.evidence;
    const externalId = providerEvidence?.externalId;
    const provider = providerEvidence?.provider;

    await prismaCommunicationService.sendMessage({
        conversationId,
        channel: "email",
        recipient: {
            channel: "email",
            externalId: recipient,
            displayName: recipient
        },
        content: body,
        metadata: {
            provider,
            externalId,
            externalMessageId: externalId,
            taskId: task.id,
            idempotencyKey,
            subject,
            recipient,
            inReplyTo: inboundReply?.inReplyTo,
            references: inboundReply?.references,
            verified: result.verified,
            executionMode
        }
    });

    const deals =
        await dealService.getCompanyDeals(
            company.id
        );

    const activeDeal = deals[0];

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
            `ConversationId: ${conversationId}.`,
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
