import {

    AgentTask,

    AgentResult

} from "../../../shared/agents/interface";

import {

    placeVoiceCall

} from "../../../shared/voice/call";

import {

    resolveContact

} from "../../../shared/crm/resolver";

import {

    buildCommunicationBrief

} from "../../../shared/communication/brief";

import {

    FollowUpObjective

} from "../../../shared/context/objectives";

import {

    resolveTaskContext

} from "../../../shared/context/resolver";

import {

    buildConversationPlan

} from "../../../shared/conversation/engine";

import {

    requestConversation

} from "../../../shared/ai/conversation";

export async function executeVoiceTask(

    task: AgentTask

): Promise<AgentResult> {

    const context =

        resolveTaskContext(task);

    const contact =

        resolveContact(

            context.company

        );

    if (!contact) {

        throw new Error(

            "Contact not found."

        );

    }

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

    return {

        success:

            result.success,

        summary:

            result.summary,

        completedAt:

            new Date().toISOString()

    };

}