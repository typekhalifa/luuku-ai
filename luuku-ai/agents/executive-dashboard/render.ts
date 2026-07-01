export function renderExecutiveDashboard(

    analytics: any,

    priority: any,

    insights: string[],

    recommendations: string[]

) {

    console.log("");

    console.log("==============================================");

    console.log("       LUUKU AI EXECUTIVE INTELLIGENCE");

    console.log("==============================================");

    console.log("");

    console.log("Analytics");

    console.log("----------------------------");

    console.log(`Total Tasks      : ${analytics.totalTasks}`);

    console.log(`Completed        : ${analytics.completed}`);

    console.log(`Active           : ${analytics.active}`);

    console.log(`Overdue          : ${analytics.overdue}`);

    console.log("");

    console.log("Priority");

    console.log("----------------------------");

    if (priority) {

        console.log(priority.title);

        console.log(priority.business);

    } else {

        console.log("No priority tasks.");

    }

    console.log("");

    console.log("Insights");

    console.log("----------------------------");

    if (insights.length === 0) {

        console.log("No insights available.");

    } else {

        insights.forEach(i => console.log(`• ${i}`));

    }

    console.log("");

    console.log("Recommendations");

    console.log("----------------------------");

    if (recommendations.length === 0) {

        console.log("No recommendations.");

    } else {

        recommendations.forEach(r =>

            console.log(`✓ ${r}`)

        );

    }

    console.log("");

    console.log("==============================================");

}