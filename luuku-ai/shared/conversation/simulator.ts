import { ConversationPlan } from "./types";

export interface ConversationTurn {

    speaker: "Voice Agent" | "Client";

    message: string;

}

export function simulateConversation(

    plan: ConversationPlan

): ConversationTurn[] {

    return [

        {

            speaker: "Voice Agent",

            message:

                "Good morning. This is Luuku AI calling. Is this a good time to talk?"

        },

        {

            speaker: "Client",

            message:

                "Yes, I have a few minutes."

        },

        {

            speaker: "Voice Agent",

            message:

                "Great. I'd like to understand your current workflow and explore whether Luuku AI can help."

        },

        {

            speaker: "Client",

            message:

                "Sure, tell me more."

        },

        {

            speaker: "Voice Agent",

            message:

                "Excellent. I'd also like to schedule a short discovery meeting with your team."

        }

    ];

}