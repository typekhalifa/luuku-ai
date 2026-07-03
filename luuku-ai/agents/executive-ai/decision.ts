export interface ExecutiveTask {

    title: string;

    description: string;

    priority:
        | "low"
        | "medium"
        | "high";

}

export interface ExecutiveDecision {

    summary: string;

    priority:
        | "low"
        | "medium"
        | "high";

    reasoning: string;

    assignedAgentId: string;

    confidence: number;

    task: ExecutiveTask;

}

export function validateDecision(

    decision: ExecutiveDecision

): boolean {

    return (

        typeof decision.summary === "string" &&

        typeof decision.priority === "string" &&

        typeof decision.reasoning === "string" &&

        typeof decision.assignedAgentId === "string" &&

        typeof decision.confidence === "number" &&

        decision.confidence >= 0 &&

        decision.confidence <= 1 &&

        typeof decision.task === "object" &&

        typeof decision.task.title === "string" &&

        typeof decision.task.description === "string" &&

        typeof decision.task.priority === "string"

    );

}