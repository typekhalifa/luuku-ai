import { buildAnalytics } from "./analytics";
import { getHighestPriorityTask } from "./priorities";
import { generateInsights } from "./insights";
import { generateRecommendations } from "./recommendations";

export interface ExecutiveIntelligence {

    analytics: ReturnType<typeof buildAnalytics>;

    priority: ReturnType<typeof getHighestPriorityTask>;

    insights: string[];

    recommendations: string[];

}

export function buildExecutiveIntelligence(): ExecutiveIntelligence {

    return {

        analytics: buildAnalytics(),

        priority: getHighestPriorityTask(),

        insights: generateInsights(),

        recommendations: generateRecommendations()

    };

}