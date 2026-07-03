export interface ExecutiveDecision {

    summary: string;

    priority: string;

    reasoning: string;

    recommendedAction: string;

    assignedAgent: string;

    confidence: number;

}

export function validateDecision(
    decision: ExecutiveDecision
): boolean {

    return (

        typeof decision.summary === "string" &&

        typeof decision.priority === "string" &&

        typeof decision.reasoning === "string" &&

        typeof decision.recommendedAction === "string" &&

        typeof decision.assignedAgent === "string" &&

        typeof decision.confidence === "number" &&

        decision.confidence >= 0 &&

        decision.confidence <= 1

    );

}