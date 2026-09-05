import type { MemoryAwareStrategyDecision } from "./memory-aware-strategy.js";
import type { ObjectiveIntervention } from "./objective-intervention.js";

export type AdaptiveInterventionMode =
    | "CONTINUE"
    | "ADJUST_APPROACH"
    | "CHANGE_APPROACH"
    | "RECOVER_FAILED_WORK";

export interface AdaptiveInterventionInput {
    readonly intervention: ObjectiveIntervention;
    readonly strategy: MemoryAwareStrategyDecision;
}

export interface AdaptiveInterventionDecision {
    readonly objectiveId: string;
    readonly mode: AdaptiveInterventionMode;
    readonly risk: MemoryAwareStrategyDecision["actionRisk"];
    readonly strategy: MemoryAwareStrategyDecision["adaptation"];
    readonly intervention: ObjectiveIntervention["type"];
    readonly reason: string;
    readonly evidence: Readonly<Record<string, unknown>>;
}

/**
 * Combines current objective intervention signals with historical strategy
 * evidence. This boundary chooses an intervention mode only; it never selects
 * an agent, creates a plan, requests approval, or executes work.
 */
export class ExecutiveAdaptiveInterventionPolicy {
    evaluate(input: AdaptiveInterventionInput): AdaptiveInterventionDecision {
        const { intervention, strategy } = input;

        if (intervention.objectiveId !== strategy.objectiveId) {
            throw new Error(
                `Adaptive intervention failed: objective identity does not match for ${strategy.objectiveId}.`,
            );
        }

        if (!intervention.interventionRequired || intervention.type === "NO_INTERVENTION") {
            return {
                objectiveId: strategy.objectiveId,
                mode: "CONTINUE",
                risk: strategy.actionRisk,
                strategy: strategy.adaptation,
                intervention: intervention.type,
                reason: "Current objective evidence does not require intervention.",
                evidence: { ...intervention.evidence, adaptation: strategy.adaptation },
            };
        }

        if (intervention.type === "RECOVER_FAILED_WORK") {
            return {
                objectiveId: strategy.objectiveId,
                mode: "RECOVER_FAILED_WORK",
                risk: strategy.actionRisk,
                strategy: strategy.adaptation,
                intervention: intervention.type,
                reason: "Failed work remains the immediate intervention target.",
                evidence: { ...intervention.evidence, adaptation: strategy.adaptation },
            };
        }

        if (strategy.adaptation === "CHANGE_APPROACH") {
            return {
                objectiveId: strategy.objectiveId,
                mode: "CHANGE_APPROACH",
                risk: strategy.actionRisk,
                strategy: strategy.adaptation,
                intervention: intervention.type,
                reason: strategy.reason,
                evidence: { ...intervention.evidence, adaptation: strategy.adaptation },
            };
        }

        return {
            objectiveId: strategy.objectiveId,
            mode: "ADJUST_APPROACH",
            risk: strategy.actionRisk,
            strategy: strategy.adaptation,
            intervention: intervention.type,
            reason: strategy.reason,
            evidence: { ...intervention.evidence, adaptation: strategy.adaptation },
        };
    }
}
