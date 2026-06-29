import { DashboardMetrics } from "./metrics";
import { TimelineEvent } from "../../shared/types/timeline";

export function renderDashboard(
    metrics: DashboardMetrics,
    timeline: TimelineEvent[]
) {

    console.clear();

    console.log("==============================================");
    console.log("          LUUKU AI OPERATIONS");
    console.log("==============================================\n");

    console.log(`Total Prospects      : ${metrics.total}`);
    console.log(`Researched           : ${metrics.researched}`);
    console.log(`Contacted            : ${metrics.contacted}`);
    console.log(`Meetings             : ${metrics.meetings}`);
    console.log(`Proposals            : ${metrics.proposals}`);
    console.log(`Won                  : ${metrics.won}`);
    console.log(`Lost                 : ${metrics.lost}`);
    console.log(`Average Fit Score    : ${metrics.averageFit}/10`);

    console.log("\n==============================================");
    console.log("Latest Activity");
    console.log("==============================================");

    if (timeline.length === 0) {

        console.log("No timeline events yet.");

    } else {

        timeline.forEach(event => {

            console.log(`${event.timestamp}`);
            console.log(`Agent   : ${event.agent}`);
            console.log(`Action  : ${event.action}`);
            console.log(`Details : ${event.details}`);
            console.log("----------------------------------------------");

        });

    }

    console.log("\n==============================================");

}