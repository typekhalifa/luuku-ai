import { ConversationPlan }

from "./types";

import { CommunicationBrief }

from "../communication/types";

import {

    chooseConversationStrategy

} from "./strategy";

import {

    BusinessObjective

} from "../context/objectives";

export function buildConversationPlan(

    brief: CommunicationBrief,

    objective: BusinessObjective

): ConversationPlan {

    const strategy =

        chooseConversationStrategy(

            objective

        );

    return {

        strategy,

        stages: [

            {

                title: "Greeting",

                objective:

                    "Introduce yourself.",

                expectedOutcome:

                    "Prospect engaged."

            },

            {

                title: "Discovery",

                objective:

                    "Understand current workflow.",

                expectedOutcome:

                    "Pain points identified."

            },

            {

                title: "Value Proposition",

                objective:

                    "Present Luuku AI.",

                expectedOutcome:

                    "Interest generated."

            },

            {

                title: "Closing",

                objective:

                    brief.desiredOutcome,

                expectedOutcome:

                    "Clear next step agreed."

            }

        ]

    };

}