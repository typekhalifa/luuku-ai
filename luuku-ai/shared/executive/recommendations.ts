import { buildExecutiveInsights } from "./insights";
import { getHighestPriorityTask } from "./priorities";

export function generateRecommendations(): string[] {

    const recommendations: string[] = [];

    const highest = getHighestPriorityTask();

    if (highest) {

        recommendations.push(

            `Prioritize "${highest.title}" for ${highest.business}.`

        );

    }

    const insights = buildExecutiveInsights();

    if (

        insights.messages.some(

            message => message.includes("overdue")

        )

    ) {

        recommendations.push(

            "Resolve overdue tasks before creating new work."

        );

    }

    if (

        insights.messages.some(

            message => message.includes("No active")

        )

    ) {

        recommendations.push(

            "Assign work to an available agent."

        );

    }

    if (recommendations.length === 0) {

        recommendations.push(

            "Operations look healthy. Continue executing the current plan."

        );

    }

    return recommendations;

}