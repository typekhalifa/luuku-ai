import { Contact } from "../crm/types";

import { CommunicationBrief } from "./types";

import { BusinessObjective } from "../context/objectives";

export function buildCommunicationBrief(

    contact: Contact,

    objective: BusinessObjective

): CommunicationBrief {

    return {

        contactName: contact.name,

        company: contact.company,

        objective: objective.title,

        tone: "professional",

        keyTalkingPoints: [

            "Introduce Luuku AI.",

            objective.description,

            "Understand the client's current workflow.",

            "Explain how Luuku AI can help.",

            "Answer any questions.",

            "Agree on the next step."

        ],

        desiredOutcome:

            objective.desiredOutcome

    };

}