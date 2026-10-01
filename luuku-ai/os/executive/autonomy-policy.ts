import type { ExecutiveIntent } from "./executive-intent.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";

export type AutonomyDecision = "AUTONOMOUS" | "FOUNDER_APPROVAL" | "NO_ACTION";

export interface AutonomyPolicyRule {
    readonly capability: string;
    readonly decision: Exclude<AutonomyDecision, "NO_ACTION">;
    readonly reason: string;
}

export interface AutonomyPolicyRequest {
    readonly intent: ExecutiveIntent;
    readonly plan: ExecutionPlan;
}

export interface AutonomyPolicyResult {
    readonly decision: AutonomyDecision;
    readonly reason: string;
    readonly requiresFounderApproval: boolean;
    readonly evidence: Record<string, unknown>;
}

/**
 * Explicit policy boundary between planning and execution.
 * It decides whether a valid plan may proceed autonomously or must wait for the founder.
 * It never creates approvals, queue items, or executions.
 */
export class ExecutiveAutonomyPolicy {
    constructor(private readonly rules: readonly AutonomyPolicyRule[]) {}

    evaluate(request: AutonomyPolicyRequest): AutonomyPolicyResult {
        if (request.intent.type === "NO_ACTION") {
            return {
                decision: "NO_ACTION",
                reason: "Executive intent explicitly requires no action.",
                requiresFounderApproval: false,
                evidence: { intentId: request.intent.id, planId: request.plan.id },
            };
        }

        if (request.plan.steps.length === 0) {
            throw new Error(`Autonomy policy failed: plan ${request.plan.id} has no execution steps.`);
        }

        const decisions = request.plan.steps.map((step) => {
            const rule = this.rules.find((candidate) => candidate.capability === step.capability);
            if (!rule) {
                throw new Error(`Autonomy policy failed: no rule exists for capability ${step.capability}.`);
            }
            return rule;
        });

        if (request.plan.requiresFounderApproval || decisions.some((rule) => rule.decision === "FOUNDER_APPROVAL")) {
            return {
                decision: "FOUNDER_APPROVAL",
                reason: decisions.find((rule) => rule.decision === "FOUNDER_APPROVAL")?.reason
                    ?? "Execution plan explicitly requires founder approval.",
                requiresFounderApproval: true,
                evidence: {
                    intentId: request.intent.id,
                    planId: request.plan.id,
                    capabilities: request.plan.steps.map((step) => step.capability),
                },
            };
        }

        return {
            decision: "AUTONOMOUS",
            reason: decisions.map((rule) => rule.reason).join(" "),
            requiresFounderApproval: false,
            evidence: {
                intentId: request.intent.id,
                planId: request.plan.id,
                capabilities: request.plan.steps.map((step) => step.capability),
            },
        };
    }
}
