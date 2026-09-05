import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";

export interface ObjectiveSelectionCandidate {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
}

export interface ObjectivePrioritySelectorOptions {
    readonly maxSelections?: number;
}

const priorityRank: Record<ExecutiveObjectiveRecord["priority"], number> = {
    high: 3,
    medium: 2,
    low: 1,
};

/** Deterministically ranks objectives using urgency, progress intervention, priority, and stable tie-breakers. */
export class ExecutiveObjectivePrioritySelector {
    private readonly maxSelections: number;

    constructor(options: ObjectivePrioritySelectorOptions = {}) {
        const maxSelections = options.maxSelections ?? 1;
        if (!Number.isInteger(maxSelections) || maxSelections < 1) {
            throw new Error("maxSelections must be a positive integer.");
        }
        this.maxSelections = maxSelections;
    }

    rank(candidates: readonly ObjectiveSelectionCandidate[]): readonly ObjectiveSelectionCandidate[] {
        return [...candidates].sort((left, right) => {
            const urgencyDifference = right.urgency.score - left.urgency.score;
            if (urgencyDifference !== 0) return urgencyDifference;
            const interventionDifference = right.progressTrend.interventionScore - left.progressTrend.interventionScore;
            if (interventionDifference !== 0) return interventionDifference;
            const priorityDifference = priorityRank[right.objective.priority] - priorityRank[left.objective.priority];
            if (priorityDifference !== 0) return priorityDifference;
            const progressDifference = left.assessment.progress - right.assessment.progress;
            if (progressDifference !== 0) return progressDifference;
            const createdAtDifference = left.objective.createdAt.getTime() - right.objective.createdAt.getTime();
            if (createdAtDifference !== 0) return createdAtDifference;
            return left.objective.id.localeCompare(right.objective.id);
        });
    }

    select(candidates: readonly ObjectiveSelectionCandidate[]): readonly ObjectiveSelectionCandidate[] {
        return this.rank(candidates).slice(0, this.maxSelections);
    }
}
