import { buildAnalytics } from "./analytics";

export function generateInsights(): string[] {

    const analytics = buildAnalytics();

    const insights: string[] = [];

    if (analytics.overdueTasks > 0) {

        insights.push(

            `You have ${analytics.overdueTasks} overdue task(s).`

        );

    }

    if (analytics.completedTasks > analytics.activeTasks) {

        insights.push(

            "Execution is ahead of workload."

        );

    }

    if (analytics.activeTasks === 0) {

        insights.push(

            "No active work is currently assigned."

        );

    }

    return insights;

}