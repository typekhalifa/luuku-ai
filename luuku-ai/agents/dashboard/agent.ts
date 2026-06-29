import { calculateMetrics } from "./metrics";
import { getLatestTimeline } from "./timeline";
import { renderDashboard } from "./render";

function runDashboard() {

    const metrics = calculateMetrics();

    const timeline = getLatestTimeline();

    renderDashboard(
        metrics,
        timeline
    );

}

runDashboard();