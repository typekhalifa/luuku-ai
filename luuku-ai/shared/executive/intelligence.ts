import { buildAnalytics } from "./analytics";
import { getHighestPriorityTask } from "./priorities";
import { buildExecutiveInsights } from "./insights";
import { generateRecommendations } from "./recommendations";

export interface ExecutiveIntelligence {
    analytics: ReturnType<typeof buildAnalytics>;
    priority: ReturnType<typeof getHighestPriorityTask>;
    insights: Awaited<ReturnType<typeof buildExecutiveInsights>>;
    recommendations: string[];
}

export async function buildExecutiveIntelligence(): Promise<ExecutiveIntelligence> {
    return {
        analytics: buildAnalytics(),
        priority: getHighestPriorityTask(),
        insights: await buildExecutiveInsights(),
        recommendations: await generateRecommendations(),
    };
}
