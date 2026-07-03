import { loadExecutiveHistory } from "./history";

export function buildExecutiveMemory() {

    const history = loadExecutiveHistory();

    return {

        totalDecisions: history.length,

        latestDecision:

            history[0] ?? null,

        recent:

            history.slice(0, 10)

    };

}