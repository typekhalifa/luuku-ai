import { buildExecutiveInsights } from "./insights";
import { getHighestPriorityTask } from "./priorities";

export async function generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const highest = getHighestPriorityTask();

    if (highest) {
        const dueDate = new Date(highest.dueDate);
        const overdue = !Number.isNaN(dueDate.getTime()) && dueDate < new Date();

        if (/follow[\s-]?up/i.test(`${highest.title} ${highest.description}`)) {
            recommendations.push(
                `${overdue ? "Primary action" : "Next action"}: have the Sales Agent follow up with ${highest.business} by email. If the CRM contact is missing or lacks a verified email, enrich the contact first; do not send until CRM validation passes.`,
            );
        } else {
            recommendations.push(
                `${overdue ? "Follow up now" : "Handle next"} with ${highest.business}: ${highest.title}.`,
            );
        }
    }

    const insights = await buildExecutiveInsights();

    // A concrete pending task takes precedence over generic CRM housekeeping.
    // The executive should clear the business action first, then return to the
    // broader activity queue.
    if (insights.overdueActivities > 0 && !highest) {
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
