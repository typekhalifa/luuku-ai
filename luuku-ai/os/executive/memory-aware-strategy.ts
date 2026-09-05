import type { ExecutiveLearningRecord } from "./executive-memory.js";
import type { StrategicObjective } from "./strategic-planning-engine.js";

export type StrategicRisk = "LOW" | "MEDIUM" | "HIGH";
export type StrategicAdaptation = "CONTINUE" | "ADJUST_APPROACH" | "CHANGE_APPROACH";

export interface MemoryAwareStrategyInput {
    readonly objective: StrategicObjective;
    readonly learning: readonly ExecutiveLearningRecord[];
}

export interface MemoryAwareStrategyDecision {
    readonly objectiveId: string;
    readonly actionRisk: StrategicRisk;
    readonly adaptation: StrategicAdaptation;
    readonly relevantPatterns: readonly ExecutiveLearningRecord[];
    readonly reason: string;
}

/** Uses historical learning as decision evidence without creating or executing work. */
export class MemoryAwareStrategyEngine {
    evaluate(input: MemoryAwareStrategyInput): MemoryAwareStrategyDecision {
        const relevantPatterns = input.learning.filter((record) =>
            record.objectiveIds.includes(input.objective.objectiveId),
        );

        const repeatedFailure = relevantPatterns.find((record) => record.pattern === "REPEATED_FAILURE");
        const failurePattern = relevantPatterns.find((record) => record.pattern === "FAILURE_PATTERN");
        const successPattern = relevantPatterns.find((record) => record.pattern === "SUCCESS_PATTERN");

        if (repeatedFailure) {
            return {
                objectiveId: input.objective.objectiveId,
                actionRisk: "HIGH",
                adaptation: "CHANGE_APPROACH",
                relevantPatterns,
                reason: repeatedFailure.lesson ?? "Repeated failure indicates that the current approach should change.",
            };
        }

        if (failurePattern) {
            return {
                objectiveId: input.objective.objectiveId,
                actionRisk: "MEDIUM",
                adaptation: "ADJUST_APPROACH",
                relevantPatterns,
                reason: failurePattern.lesson ?? "Historical failures indicate that the current approach needs adjustment.",
            };
        }

        if (successPattern) {
            return {
                objectiveId: input.objective.objectiveId,
                actionRisk: "LOW",
                adaptation: "CONTINUE",
                relevantPatterns,
                reason: successPattern.lesson ?? "Historical success supports continuing the current approach.",
            };
        }

        return {
            objectiveId: input.objective.objectiveId,
            actionRisk: "LOW",
            adaptation: "CONTINUE",
            relevantPatterns,
            reason: "No relevant historical learning was found; continue while gathering evidence.",
        };
    }
}
