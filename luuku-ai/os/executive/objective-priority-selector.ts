import type { ExecutiveObjectiveRecord } from "./objective-engine.js";
import type { ObjectiveAssessment } from "./objective-engine.js";

export interface ObjectiveSelectionCandidate {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
}

export interface ObjectivePrioritySelectorOptions {
    /** Maximum number of objectives selected for the next work decision. */
    readonly maxSelections?: number;
}

const priorityRank: Record<ExecutiveObjectiveRecord["priority"], number> = {
    high: 3,
    medium: 2,
    low: 1,
};

/**
 * Deterministically ranks active objectives for the next executive decision.
 * Selection is pure: it does not create plans, request approval, enqueue work,
 * or execute agents.
 */
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
            const priorityDifference = priorityRank[right.objective.priority] - priorityRank[left.objective.priority];
            if (priorityDifference !== 0) return priorityDifference;

            const attentionDifference = Number(right.assessment.attentionRequired) - Number(left.assessment.attentionRequired);
            if (attentionDifference !== 0) return attentionDifference;

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
