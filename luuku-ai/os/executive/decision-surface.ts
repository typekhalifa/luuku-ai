export type ExecutiveDecisionAction = "APPROVE" | "REVIEW" | "REJECT";

export interface ExecutiveDecision {
    id: string;
    action: string;
    reason: string;
    actions: readonly ExecutiveDecisionAction[];
}

export interface DecisionResult {
    decisionId: string;
    action: ExecutiveDecisionAction;
}

export class ExecutiveDecisionSurface {
    create(input: { id: string; action: string; reason: string }): ExecutiveDecision {
        return {
            id: input.id,
            action: input.action,
            reason: input.reason,
            actions: ["APPROVE", "REVIEW", "REJECT"],
        };
    }

    decide(decision: ExecutiveDecision, action: ExecutiveDecisionAction): DecisionResult {
        if (!decision.actions.includes(action)) {
            throw new Error(`Decision action is not available: ${action}`);
        }
        return { decisionId: decision.id, action };
    }
}
