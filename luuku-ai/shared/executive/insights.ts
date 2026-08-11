import { companyService } from "../database/services/company.service";
import { dealService } from "../database/services/deal.service";
import { activityService } from "../database/services/activity.service";

export interface ExecutiveInsights {
    pipelineValue: number;
    activeDeals: number;
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
    const pipelineValue = deals.reduce(
        (total, deal) => total + deal.value,
        0,
    );
    const activeDeals = deals.filter(
        deal => deal.stage !== "won" && deal.stage !== "lost",
    ).length;
    const overdueActivities = activities.filter(activity => {
        const ageDays =
            (Date.now() - new Date(activity.createdAt).getTime()) /
            (1000 * 60 * 60 * 24);
        return ageDays > 7;
    }).length;

    if (activeDeals === 0) {
        messages.push("No active sales opportunities.");
    }
    if (overdueActivities > 0) {
        messages.push(`${overdueActivities} CRM activity(ies) require follow-up.`);
    }

    return {
        pipelineValue,
        activeDeals,
        overdueActivities,
        topPriorityCompany: companies[0]?.name,
        messages,
    };
}
