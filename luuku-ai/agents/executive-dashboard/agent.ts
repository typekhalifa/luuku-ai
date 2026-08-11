import { buildExecutiveIntelligence } from "../../shared/executive/intelligence";
import { renderExecutiveDashboard } from "./render";

async function runExecutiveDashboard() {
    const executive = await buildExecutiveIntelligence();

    renderExecutiveDashboard(
        executive.analytics,
        executive.priority,
        executive.insights.messages,
        executive.recommendations,
    );
}

runExecutiveDashboard();
