import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import type { AutonomyPolicyResult } from "./autonomy-policy.js";

export type ExecutionDecisionStatus = "ELIGIBLE" | "BLOCKED" | "NOT_EXECUTABLE";

export interface ExecutionDecision {
    readonly id: string;
    readonly status: ExecutionDecisionStatus;
    readonly intentId: string;
    readonly planId: string;
    readonly reason: string;
    readonly requiresFounderApproval: boolean;
    readonly evidence: Record<string, unknown>;
    readonly createdAt: Date;
}

/**
 * Converts an autonomy-policy result into the execution boundary contract.
 * This layer only declares eligibility; it never queues or executes work.
 */
export class ExecutionDecisionProjector {
    decide(
        intent: ExecutiveIntent,
        plan: ExecutionPlan,
        policy: AutonomyPolicyResult,
    ): ExecutionDecision {
        if (policy.decision === "NO_ACTION") {
            return {
                id: `execution-decision-${intent.id}`,
                status: "NOT_EXECUTABLE",
                intentId: intent.id,
                planId: plan.id,
                reason: policy.reason,
                requiresFounderApproval: false,
                evidence: { ...policy.evidence },
                createdAt: new Date(),
            };
        }

        if (policy.decision === "FOUNDER_APPROVAL") {
            return {
                id: `execution-decision-${intent.id}`,
                status: "BLOCKED",
                intentId: intent.id,
                planId: plan.id,
                reason: policy.reason,
                requiresFounderApproval: true,
                evidence: { ...policy.evidence },
                createdAt: new Date(),
            };
        }

        return {
            id: `execution-decision-${intent.id}`,
            status: "ELIGIBLE",
            intentId: intent.id,
            planId: plan.id,
            reason: policy.reason,
            requiresFounderApproval: false,
            evidence: { ...policy.evidence },
            createdAt: new Date(),
        };
    }
}
