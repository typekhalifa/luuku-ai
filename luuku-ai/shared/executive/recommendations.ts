import { buildExecutiveInsights } from "./insights";
import { getHighestPriorityTask } from "./priorities";

export async function generateRecommendations(): Promise<string[]> {
    const recommendations: string[] = [];
    const highest = getHighestPriorityTask();
    const insights = await buildExecutiveInsights();

    const controlledTestEmail =
        process.env.EMAIL_MODE === "live" &&
        process.env.LUUKU_TEST_CONTACT_EMAIL?.trim();

    const controlledTestCompany =
        process.env.LUUKU_TEST_CONTACT_COMPANY?.trim();

    // The controlled live-email harness is an explicit integration test. In
    // that mode the executive priority must be the controlled communication
    // path, not the normal CRM housekeeping path. This prevents LEX from
    // consuming the test turn by prioritizing overdue CRM activities.
    if (controlledTestEmail && controlledTestCompany) {
        recommendations.push(
            `AUTHORITATIVE CONTROLLED TEST PRIORITY: send exactly one controlled test email to ${controlledTestEmail} for ${controlledTestCompany} using the Sales Agent. Do not execute crm.prioritize_overdue in this test turn. Founder approval is still required before email.send execution.`,
        );
    } else if (highest) {
        const dueDate = new Date(highest.dueDate);
        const overdue = !Number.isNaN(dueDate.getTime()) && dueDate < new Date();
        const taskText = `${highest.title} ${highest.description}`;

        if (/follow[\s-]?up/i.test(taskText)) {
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

    if (!controlledTestEmail && !highest && insights.messages.some((message: string) => message.includes("No active"))) {
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
