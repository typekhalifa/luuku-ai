import crypto from "crypto";

import {
    AgentTask,
    AgentResult
} from "../../../shared/agents/interface";

import {
    placeVoiceCall
} from "../../../shared/voice/call";

import {
    buildCommunicationBrief
} from "../../../shared/communication/brief";

import {
    FollowUpObjective
} from "../../../shared/context/objectives";

import {
    buildConversationPlan
} from "../../../shared/conversation/engine";

import {
    requestConversation
} from "../../../shared/ai/conversation";

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
    updateDealsAfterCall
} from "../../../shared/crm/deals/workflow";

import {
    Contact
} from "../../../shared/crm/types";

export async function executeVoiceTask(

    task: AgentTask,

    contact: Contact

): Promise<AgentResult> {

    if (!contact.phoneNumber) {

        throw new Error(
            "Contact has no phone number."
        );

    }

    const brief =
        buildCommunicationBrief(
            contact,
            FollowUpObjective
        );

    console.log("");

    console.log("========================================");

    console.log("     COMMUNICATION BRIEF");

    console.log("========================================");

    console.log("");

    console.log(brief);

    const conversation =
        buildConversationPlan(
            brief,
            FollowUpObjective
        );

    console.log("");

    console.log("========================================");

    console.log("   CONVERSATION STRATEGY");

    console.log("========================================");

    console.log("");

    console.log(
        `Strategy : ${conversation.strategy}`
    );

    console.log("");

    console.log("========================================");

    console.log("     CONVERSATION PLAN");

    console.log("========================================");

    console.log("");

    for (
        const stage of conversation.stages
    ) {

        console.log(
            `• ${stage.title}`
        );

        console.log(
            `  Objective : ${stage.objective}`
        );

        console.log(
            `  Outcome   : ${stage.expectedOutcome}`
        );

        console.log("");

    }

    const transcript =
        await requestConversation(
            brief,
            conversation
        );

    console.log("");

    console.log("========================================");

    console.log("      AI CONVERSATION");

    console.log("========================================");

    console.log("");

    console.log(transcript);

    const result =
        await placeVoiceCall({

            contactName:
                brief.contactName,

            company:
                brief.company,

            phoneNumber:
                contact.phoneNumber,

            purpose:
                brief.objective,

            language:
                contact.preferredLanguage,

            tone:
                brief.tone

        });

    const company =
        await companyService.findCompany(
            brief.company
        );

    if (!company) {

        throw new Error(
            `Company not found in PostgreSQL: ${brief.company}`
        );

    }

    const deals =
        await dealService.getCompanyDeals(
            company.id
        );

    const activeDeal =
        deals[0];

    const completed =
        result.status === "completed" ||
        result.status === "verified";

    if (result.executed) {

        const outcome =
            completed
                ? "Completed"
                : "Failed";

        const activity: Activity = {

            id:
                crypto.randomUUID(),

            companyId:
                company.id,

            contactId:
                contact.id,

            dealId:
                activeDeal?.id,

            type:
                "call",

            title:
                "Sales Follow-up Call",

            description:
                result.summary,

            outcome,

            createdBy:
                "Voice Agent",

            completed,

            createdAt:
                new Date().toISOString()

        };

        await activityService.createActivity(
            activity
        );

        console.log("");

        console.log("========================================");

        console.log("      ACTIVITY LOGGED TO POSTGRESQL");

        console.log("========================================");

        console.log("");

        console.log(activity);

    } else {

        console.log("");

        console.log("========================================");

        console.log("      CRM ACTIVITY NOT LOGGED");

        console.log("========================================");

        console.log("");

        console.log(
            "Reason : Communication was not actually executed."
        );

        console.log(
            `Status : ${result.status}`
        );

    }

    await updateDealsAfterCall(

        company.id,

        result.summary,

        result.status

    );

    return {

        success:
            result.success,

        summary:
            result.status === "simulated"
                ? "Sales communication prepared and simulated. Real call was not executed; CRM activity and deal state were left unchanged."
                : result.summary,

        completedAt:
            new Date().toISOString(),

        executionStatus:
            result.status,

        executed:
            result.executed,

        verified:
            result.verified

    };

}