import { companyService } from "../database/services/company.service";
import { dealService } from "../database/services/deal.service";
import { activityService } from "../database/services/activity.service";

export interface ExecutiveInsights {
    pipelineValue: number;
    activeDeals: number;
    openActivities: number;
    overdueActivities: number;
    topPriorityCompany?: string;
    messages: string[];
}

export async function buildExecutiveInsights(): Promise<ExecutiveInsights> {
    const [companies, deals, activities] = await Promise.all([
        companyService.getCompanies(),
        dealService.getDeals(),
        activityService.getActivities(),
    ]);

    const messages: string[] = [];
    const now = Date.now();
    const pipelineValue = deals.reduce(
        (total, deal) => total + deal.value,
        0,
    );
    const activeDeals = deals.filter(
        deal => deal.stage !== "won" && deal.stage !== "lost",
    ).length;

    const openActivities = activities.filter(
        activity => !activity.completed,
    ).length;

    // "Overdue" has one canonical meaning across executive intelligence and
    // Sales execution: an open activity with an explicit dueAt in the past.
    // Activity age alone must never make an activity overdue.
    const overdueActivities = activities.filter(activity =>
        !activity.completed &&
        Boolean(activity.dueAt) &&
        new Date(activity.dueAt as string).getTime() < now,
    ).length;

    if (activeDeals === 0) {
        messages.push("No active sales opportunities.");
    }

    if (overdueActivities > 0) {
        messages.push(`${overdueActivities} CRM activity(ies) are overdue and require follow-up.`);
    }

    if (openActivities > 0 && overdueActivities === 0) {
        messages.push(`${openActivities} CRM activity(ies) remain open for follow-up; none are currently overdue.`);
    } else if (openActivities > overdueActivities) {
        messages.push(`${openActivities - overdueActivities} other open CRM activity(ies) remain after the overdue backlog.`);
    }

    return {
        pipelineValue,
        activeDeals,
        openActivities,
        overdueActivities,
        topPriorityCompany: companies[0]?.name,
        messages,
    };
}
