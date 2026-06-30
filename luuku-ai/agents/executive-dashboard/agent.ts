import { buildExecutiveIntelligence } from "../../shared/executive/intelligence";
import { renderExecutiveDashboard } from "./render";

function runExecutiveDashboard() {

    const executive = buildExecutiveIntelligence();

    renderExecutiveDashboard(

        executive.analytics,

        executive.priority,

        executive.insights,

        executive.recommendations

    );

}

runExecutiveDashboard();