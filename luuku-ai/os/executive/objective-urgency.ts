import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";

export interface ObjectiveUrgencyInput {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly now: Date;
}

export interface ObjectiveUrgencyScore {
    readonly objectiveId: string;
    readonly score: number;
    readonly overdue: boolean;
    readonly dueSoon: boolean;
    readonly stale: boolean;
}

/** Computes deterministic urgency signals without scheduling or executing work. */
export class ExecutiveObjectiveUrgencyScorer {
    score(input: ObjectiveUrgencyInput): ObjectiveUrgencyScore {
        const { objective, assessment, now } = input;
        const ageMs = Math.max(0, now.getTime() - objective.createdAt.getTime());
        const stale = objective.staleAfterDays !== undefined && ageMs >= objective.staleAfterDays * 86_400_000;
        const overdue = objective.deadlineAt !== undefined && objective.deadlineAt.getTime() < now.getTime();
        const dueSoon = objective.deadlineAt !== undefined && !overdue && objective.deadlineAt.getTime() - now.getTime() <= 86_400_000;

        let score = Math.max(0, 100 - assessment.progress);
        if (overdue) score += 100;
        else if (dueSoon) score += 60;
        if (assessment.attentionRequired) score += 20;
        if (stale) score += 15;

        return { objectiveId: objective.id, score, overdue, dueSoon, stale };
    }
}
