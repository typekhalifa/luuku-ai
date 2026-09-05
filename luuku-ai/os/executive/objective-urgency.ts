import type { ExecutiveObjectiveRecord } from "./objective-engine.js";
import type { ObjectiveAssessment } from "./objective-engine.js";

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

/**
 * Computes deterministic urgency signals without scheduling or executing work.
 * Optional objective metadata may provide a deadline using an ISO timestamp
 * under `metadata.deadlineAt` and a stale threshold using `metadata.staleAfterDays`.
 */
export class ExecutiveObjectiveUrgencyScorer {
    score(input: ObjectiveUrgencyInput): ObjectiveUrgencyScore {
        const { objective, assessment, now } = input;
        const metadata = objective as ExecutiveObjectiveRecord & {
            readonly metadata?: Readonly<Record<string, unknown>>;
        };
        const deadlineAt = this.readDate(metadata.metadata?.deadlineAt);
        const staleAfterDays = this.readPositiveNumber(metadata.metadata?.staleAfterDays);
        const ageMs = Math.max(0, now.getTime() - objective.createdAt.getTime());
        const stale = staleAfterDays !== undefined && ageMs >= staleAfterDays * 86_400_000;
        const overdue = deadlineAt !== undefined && deadlineAt.getTime() < now.getTime();
        const dueSoon = deadlineAt !== undefined && !overdue && deadlineAt.getTime() - now.getTime() <= 86_400_000;

        let score = 0;
        if (overdue) score += 100;
        else if (dueSoon) score += 60;
        if (assessment.attentionRequired) score += 20;
        if (stale) score += 15;
        score += Math.max(0, 100 - assessment.progress);

        return {
            objectiveId: objective.id,
            score,
            overdue,
            dueSoon,
            stale,
        };
    }

    private readDate(value: unknown): Date | undefined {
        if (typeof value !== "string") return undefined;
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? undefined : date;
    }

    private readPositiveNumber(value: unknown): number | undefined {
        return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : undefined;
    }
}
