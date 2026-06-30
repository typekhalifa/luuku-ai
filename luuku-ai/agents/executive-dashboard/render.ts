import { ExecutiveAnalytics } from "../../shared/executive/analytics";
import { Task } from "../../shared/types/task";

export function renderExecutiveDashboard(

    analytics: ExecutiveAnalytics,

    priority: Task | null,

    insights: string[],

    recommendations: string[]

) {

    console.clear();

    console.log("==============================================");
    console.log("       LUUKU AI EXECUTIVE INTELLIGENCE");
    console.log("==============================================\n");

    console.log("Analytics");
    console.log("----------------------------");

    console.log(`Total Tasks      : ${analytics.totalTasks}`);
    console.log(`Completed        : ${analytics.completedTasks}`);
    console.log(`Active           : ${analytics.activeTasks}`);
    console.log(`Overdue          : ${analytics.overdueTasks}`);

    console.log("\nPriority");
    console.log("----------------------------");

    if (priority) {

        console.log(priority.title);
        console.log(priority.business);

    } else {

        console.log("No priority task.");

    }

    console.log("\nInsights");
    console.log("----------------------------");

    insights.forEach(i => console.log("• " + i));

    console.log("\nRecommendations");
    console.log("----------------------------");

    recommendations.forEach(r => console.log("✓ " + r));

    console.log("\n==============================================");

}