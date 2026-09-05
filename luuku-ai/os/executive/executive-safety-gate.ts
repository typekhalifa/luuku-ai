import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { AutonomyPolicyResult } from "./autonomy-policy.js";

export type SafetyClassification = "SAFE_AUTONOMOUS" | "APPROVAL_REQUIRED" | "FORBIDDEN";
export type SafetyDecision = "ALLOW" | "APPROVAL" | "DENY" | "ESCALATE";

export interface ExecutiveSafetyRule {
    readonly capability: string;
    readonly classification: SafetyClassification;
    readonly reason: string;
}

export interface ExecutiveSafetyRequest {
    readonly plan: ExecutionPlan;
    readonly autonomy: AutonomyPolicyResult;
}

export interface ExecutiveSafetyResult {
    readonly decision: SafetyDecision;
    readonly reason: string;
    readonly requiresFounderApproval: boolean;
    readonly evidence: Record<string, unknown>;
}

/** Hard safety boundary after autonomy policy and before execution eligibility. */
export class ExecutiveSafetyGate {
    constructor(private readonly rules: readonly ExecutiveSafetyRule[]) {}

    evaluate(request: ExecutiveSafetyRequest): ExecutiveSafetyResult {
        if (request.plan.steps.length === 0) {
            return { decision: "ESCALATE", reason: "Safety cannot classify an empty execution plan.", requiresFounderApproval: true, evidence: { planId: request.plan.id } };
        }

        const decisions = request.plan.steps.map((step) => {
            const rule = this.rules.find((candidate) => candidate.capability === step.capability);
            return rule
                ? { capability: step.capability, classification: rule.classification, reason: rule.reason }
                : { capability: step.capability, classification: "MISSING", reason: `No safety classification exists for capability ${step.capability}.` };
        });

        if (decisions.some((item) => item.classification === "MISSING")) return result("ESCALATE", "At least one capability has no safety classification.", decisions, request.plan);
        if (decisions.some((item) => item.classification === "FORBIDDEN")) return result("DENY", "At least one requested capability is forbidden.", decisions, request.plan);
        if (decisions.some((item) => item.classification === "APPROVAL_REQUIRED")) return result("APPROVAL", "At least one requested capability requires founder approval.", decisions, request.plan);

        return result("ALLOW", request.autonomy.decision === "AUTONOMOUS"
            ? "All capabilities are explicitly classified safe for autonomous execution."
            : "Safety permits execution, subject to the existing autonomy decision.", decisions, request.plan);
    }
}

function result(
    decision: SafetyDecision,
    reason: string,
    decisions: readonly { capability: string; classification: string; reason: string }[],
    plan: ExecutionPlan,
): ExecutiveSafetyResult {
    return {
        decision,
        reason,
        requiresFounderApproval: decision === "APPROVAL" || decision === "ESCALATE",
        evidence: { planId: plan.id, capabilities: decisions.map((item) => item.capability), classifications: decisions.map((item) => item.classification) },
    };
}
