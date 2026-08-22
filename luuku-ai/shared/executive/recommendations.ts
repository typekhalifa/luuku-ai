import { buildExecutiveInsights } from "./insights";
import { getHighestPriorityTask } from "./priorities";

export async function generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const highest = getHighestPriorityTask();
    const insights = await buildExecutiveInsights();

    if (highest) {
        const dueDate = new Date(highest.dueDate);
        const overdue = !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
        const taskText = `${highest.title} ${highest.description}`;

        if (/follow[\s-]?up/i.test(taskText)) {
            // A concrete pending business task is the executive priority.
            // Do not let generic CRM housekeeping compete with it.
            recommendations.push(
                `${overdue ? "Primary action" : "Next action"}: send the follow-up email to ${highest.business} using the Sales Agent. Validate the CRM contact before sending; if the contact is missing or lacks a verified email, enrich it first.`,
            );
        } else {
            recommendations.push(
                `${overdue ? "Follow up now" : "Handle next"} with ${highest.business}: ${highest.title}.`,
            );
        }
    } else if (insights.overdueActivities > 0) {
        recommendations.push(
            "Prioritize the overdue CRM activities before creating new CRM work.",
        );
    } else if (insights.openActivities > 0) {
        recommendations.push(
            "Work through the open CRM follow-up queue; no CRM activity is currently overdue.",
        );
    }

    if (!highest && insights.messages.some((message: string) => message.includes("No active"))) {
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
