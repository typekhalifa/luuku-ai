import { buildAnalytics } from "./analytics";
import { getHighestPriorityTask } from "./priorities";
import { buildExecutiveInsights } from "./insights";
import { generateRecommendations } from "./recommendations";

export interface ExecutiveIntelligence {

    analytics: ReturnType<
        typeof buildAnalytics
    >;

    priority: ReturnType<
        typeof getHighestPriorityTask
    >;

    insights: ReturnType<
        typeof buildExecutiveInsights
    >;

    recommendations: string[];

}

export function buildExecutiveIntelligence(): ExecutiveIntelligence {

    return {

        analytics:
            buildAnalytics(),

        priority:
            getHighestPriorityTask(),

        insights:
            buildExecutiveInsights(),

        recommendations:
            generateRecommendations()

    };

}