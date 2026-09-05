import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { CapabilityResolution } from "../planning/capability-resolver.js";
import { ExecutiveResourceCapacityEngine, type ResourceCapacityAssessment } from "./resource-capacity.js";

export type ExecutionCapacityDecision = "READY" | "DEFERRED";

export interface ExecutionCapacityGateResult {
    readonly decision: ExecutionCapacityDecision;
    readonly assessments: readonly ResourceCapacityAssessment[];
    readonly reason: string;
}

/**
 * Converts resource capacity into an execution-readiness decision.
 * It does not enqueue, execute, or mutate the execution plan.
 */
export class ExecutiveExecutionCapacityGate {
    constructor(private readonly capacity: ExecutiveResourceCapacityEngine) {}

    evaluate(plan: ExecutionPlan, resolutions: readonly CapabilityResolution[]): ExecutionCapacityGateResult {
        if (plan.steps.length === 0) {
            throw new Error(`Execution capacity gate failed: plan ${plan.id} has no steps.`);
        }

        const assessments = plan.steps.map((step) => {
            const resolution = resolutions.find(
                (candidate) => candidate.agentId === step.agentId && candidate.capability === step.capability,
            );
            if (!resolution) {
                throw new Error(`Execution capacity gate failed: missing resolution for ${step.agentId}/${step.capability}.`);
            }
            return this.capacity.assess(resolution);
        });

        const blocked = assessments.find((assessment) => assessment.status !== "AVAILABLE");
        if (blocked) {
            return {
                decision: "DEFERRED",
                assessments,
                reason: `Execution deferred: ${blocked.reason}`,
            };
        }

        return {
            decision: "READY",
            assessments,
            reason: "All execution steps have available agent capacity.",
        };
    }
}
