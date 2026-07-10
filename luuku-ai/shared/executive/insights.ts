import { buildAnalytics } from "./analytics";

import { getCompanies } from "../crm/companies";
import { getDeals } from "../crm/deals/repository";
import { getActivities } from "../crm/activities/repository";

export interface ExecutiveInsights {

    pipelineValue: number;

    activeDeals: number;

    overdueActivities: number;

    topPriorityCompany?: string;

    messages: string[];

}

export function buildExecutiveInsights(): ExecutiveInsights {

    const analytics = buildAnalytics();

    const companies = getCompanies();

    const deals = getDeals();

    const activities = getActivities();

    const messages: string[] = [];

    if (analytics.overdueTasks > 0) {

        messages.push(

            `You have ${analytics.overdueTasks} overdue task(s).`

        );

    }

    if (analytics.completedTasks > analytics.activeTasks) {

        messages.push(

            "Execution is ahead of workload."

        );

    }

    if (analytics.activeTasks === 0) {

        messages.push(

            "No active work is currently assigned."

        );

    }

    const pipelineValue = deals.reduce(

        (total, deal) => total + deal.value,

        0

    );

    const activeDeals = deals.filter(

        deal =>

            deal.stage !== "won" &&

            deal.stage !== "lost"

    ).length;

    const overdueActivities = activities.filter(

        activity => {

            const ageDays =

                (Date.now() -

                    new Date(activity.createdAt).getTime()) /

                (1000 * 60 * 60 * 24);

            return ageDays > 7;

        }

    ).length;

    const topPriorityCompany =

        companies[0]?.name;

    if (activeDeals === 0) {

        messages.push(

            "No active sales opportunities."

        );

    }

    if (overdueActivities > 0) {

        messages.push(

            `${overdueActivities} CRM activity(ies) require follow-up.`

        );

    }

    return {

        pipelineValue,

        activeDeals,

        overdueActivities,

        topPriorityCompany,

        messages

    };

}