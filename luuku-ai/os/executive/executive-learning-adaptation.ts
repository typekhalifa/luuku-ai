import type { ExecutiveLearningRecord } from "./executive-memory.js";
import type { ExecutiveTradeoffCandidate } from "./executive-tradeoff-engine.js";

export interface ExecutiveLearningAdaptationAdjustments {
    readonly valueAdjustment: number;
    readonly riskAdjustment: number;
}

export interface ExecutiveLearningAdaptationDecision {
    readonly originalCandidate: ExecutiveTradeoffCandidate;
    readonly adjustedCandidate: ExecutiveTradeoffCandidate;
    readonly relevantLearning: readonly ExecutiveLearningRecord[];
    readonly adjustments: ExecutiveLearningAdaptationAdjustments;
    readonly reason: string;
    readonly evidence: Readonly<Record<string, unknown>>;
}

/** Applies bounded historical learning to future economic estimates without creating execution authority. */
export class ExecutiveLearningAdaptationEngine {
    adapt(
        candidate: ExecutiveTradeoffCandidate,
        learning: readonly ExecutiveLearningRecord[],
    ): ExecutiveLearningAdaptationDecision {
        const relevantLearning = learning.filter((record) =>
            record.objectiveIds.includes(candidate.id),
        );

        const repeatedFailure = relevantLearning.find((record) => record.pattern === "REPEATED_FAILURE");
        const failurePattern = relevantLearning.find((record) => record.pattern === "FAILURE_PATTERN");
        const successPattern = relevantLearning.find((record) => record.pattern === "SUCCESS_PATTERN");

        let valueAdjustment = 0;
        let riskAdjustment = 0;
        let reason = "No relevant historical learning was found; preserve the baseline economic estimate.";

        if (repeatedFailure) {
            riskAdjustment = 20;
            reason = repeatedFailure.lesson ?? "Repeated failure requires a materially more cautious approach.";
        } else if (failurePattern) {
            riskAdjustment = 10;
            reason = failurePattern.lesson ?? "Historical failure increases future execution risk.";
        } else if (successPattern) {
            valueAdjustment = 5;
            reason = successPattern.lesson ?? "Historical success supports a modest increase in expected value.";
        }

        const adjustedCandidate: ExecutiveTradeoffCandidate = {
            ...candidate,
            objectiveValue: Math.max(0, candidate.objectiveValue + valueAdjustment),
            risk: Math.max(0, candidate.risk + riskAdjustment),
        };

        return {
            originalCandidate: candidate,
            adjustedCandidate,
            relevantLearning,
            adjustments: { valueAdjustment, riskAdjustment },
            reason,
            evidence: {
                source: "V8-G_LEARNING_ADAPTATION",
                candidateId: candidate.id,
                pattern: repeatedFailure?.pattern ?? failurePattern?.pattern ?? successPattern?.pattern ?? "NONE",
                valueAdjustment,
                riskAdjustment,
            },
        };
    }
}
