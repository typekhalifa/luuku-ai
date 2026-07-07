import { BusinessContext } from "./types";
import { BusinessObjective } from "./objectives";

export function buildBusinessContext(

    objective: BusinessObjective

): BusinessContext {

    return {

        company:

            "Rwanda Revenue Authority",

        contactName:

            "Procurement Manager",

        objective:

            objective.title,

        previousInteractions: [

            "Initial outreach completed.",

            "Waiting for follow-up."

        ],

        currentPriority:

            "high",

        executiveReasoning:

            "Highest-value revenue opportunity."

    };

}