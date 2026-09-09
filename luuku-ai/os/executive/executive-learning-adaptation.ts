import type { ExecutiveLearningRecord } from "./executive-memory.js";
import type { ExecutiveTradeoffCandidate } from "./executive-tradeoff-engine.js";

export interface ExecutiveLearningAdaptationDecision {
    readonly candidateId: string;
    readonly adjustedCandidate: ExecutiveTradeoffCandidate;
    readonly relevantPatterns: readonly ExecutiveLearningRecord[];
    readonly adjustments: Readonly<Record<string, number>>;
    readonly reason: string;
}

/** Applies bounded, deterministic learning signals to future economic decisions without creating execution authority. */
export class ExecutiveLearningAdaptationEngine {
    adapt(
        candidate: ExecutiveTradeoffCandidate,
        learning: readonly ExecutiveLearningRecord[],
    ): ExecutiveLearningAdaptationDecision {
        const relevantPatterns = learning.filter((record) =>
            record.objectiveIds.includes(candidate.id),
        );
        const repeatedFailure = relevantPatterns.some((record) => record.pattern === "REPEATED_FAILURE");
        const failurePattern = relevantPatterns.some((record) => record.pattern === "FAILURE_PATTERN");
        const successPattern = relevantPatterns.some((record) => record.pattern === "SUCCESS_PATTERN");

        let objectiveValueAdjustment = 0;
        let riskAdjustment = 0;

        if (repeatedFailure) {
            riskAdjustment = 20;
        } else if (failurePattern) {
            riskAdjustment = 10;
        } else if (successPattern) {
            objectiveValueAdjustment = 5;
        }

        const adjustedCandidate: ExecutiveTradeoffCandidate = {
            ...candidate,
            objectiveValue: Math.max(0, candidate.objectiveValue + objectiveValueAdjustment),
            risk: Math.max(0, candidate.risk + riskAdjustment),
        };

        return {
            candidateId: candidate.id,
            adjustedCandidate,
            relevantPatterns,
            adjustments: { objectiveValueAdjustment, riskAdjustment },
            reason: repeatedFailure
                ? "Repeated failure increases economic risk for the approach."
                : failurePattern
                    ? "Historical failure increases economic risk for the approach."
                    : successPattern
                        ? "Historical success increases confidence in the approach."
                        : "No relevant learning signal; preserve the original economic estimate.",
        };
    }
}
