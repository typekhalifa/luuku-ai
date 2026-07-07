import { BusinessObjective }

from "../context/objectives";

export function chooseConversationStrategy(

    objective: BusinessObjective

): string {

    switch (objective.title) {

        case "Sales Follow-up":

            return "Consultative Sales";

        case "Discovery Meeting":

            return "Discovery";

        default:

            return "Professional";

    }

}