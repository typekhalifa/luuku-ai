import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";

export interface ExecutiveWorkCandidate {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
}

export interface ExecutiveWorkArbitrationOptions {
    readonly maxSelections: number;
}

export interface ExecutiveWorkArbitrationDecision {
    readonly selected: readonly ExecutiveWorkCandidate[];
    readonly rejected: readonly ExecutiveWorkCandidate[];
    readonly budget: number;
    readonly evidence: Readonly<Record<string, unknown>>;
}

/**
 * Arbitrates competing objective work without creating plans or executing work.
 * Selection is deterministic so the decision can be audited and reproduced.
 */
export class ExecutiveWorkArbitrator {
    private readonly maxSelections: number;

    constructor(options: ExecutiveWorkArbitrationOptions) {
        if (!Number.isInteger(options.maxSelections) || options.maxSelections < 1) {
            throw new Error("maxSelections must be a positive integer.");
        }
        this.maxSelections = options.maxSelections;
    }

    arbitrate(candidates: readonly ExecutiveWorkCandidate[]): ExecutiveWorkArbitrationDecision {
        const ranked = [...candidates].sort((left, right) => {
            const urgency = (right.urgency.score + right.progressTrend.interventionScore)
                - (left.urgency.score + left.progressTrend.interventionScore);
            if (urgency !== 0) return urgency;

            const priority = this.priorityRank(right.objective.priority)
                - this.priorityRank(left.objective.priority);
            if (priority !== 0) return priority;

            const progress = left.assessment.progress - right.assessment.progress;
            if (progress !== 0) return progress;

            const created = left.objective.createdAt.getTime() - right.objective.createdAt.getTime();
            if (created !== 0) return created;

            return left.objective.id.localeCompare(right.objective.id);
        });

        const selected = ranked.slice(0, this.maxSelections);
        const rejected = ranked.slice(this.maxSelections);

        return {
            selected,
            rejected,
            budget: this.maxSelections,
            evidence: {
                source: "v8c-executive-work-arbitrator",
                candidateCount: candidates.length,
                selectedObjectiveIds: selected.map((candidate) => candidate.objective.id),
                rejectedObjectiveIds: rejected.map((candidate) => candidate.objective.id),
                budget: this.maxSelections,
            },
        };
    }

    private priorityRank(priority: ExecutiveObjectiveRecord["priority"]): number {
        return priority === "high" ? 3 : priority === "medium" ? 2 : 1;
    }
}
