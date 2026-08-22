import { buildExecutiveInsights } from "./insights";
import { getHighestPriorityTask } from "./priorities";

export async function generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const highest = getHighestPriorityTask();

    if (highest) {
        recommendations.push(
            `Prioritize "${highest.title}" for ${highest.business}.`,
        );
    }

    const insights = await buildExecutiveInsights();

    if (insights.overdueActivities > 0) {
        recommendations.push(
            "Prioritize the overdue CRM activities before creating new CRM work.",
        );
    } else if (insights.openActivities > 0) {
        recommendations.push(
            "Work through the open CRM follow-up queue; no CRM activity is currently overdue.",
        );
    }

    if (insights.messages.some((message: string) => message.includes("No active"))) {
        recommendations.push(
            "Assign work to an available agent.",
        );
    }

    if (recommendations.length === 0) {
        recommendations.push(
            "Operations look healthy. Continue executing the current plan.",
        );
    }

    return recommendations;
}
