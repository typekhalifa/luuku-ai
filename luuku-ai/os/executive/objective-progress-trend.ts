import type { ExecutiveObjectiveRecord } from "./objective-engine.js";

export type ObjectiveProgressTrend = "IMPROVING" | "STAGNANT" | "REGRESSING" | "UNKNOWN";

export interface ObjectiveProgressTrendScore {
    readonly objectiveId: string;
    readonly trend: ObjectiveProgressTrend;
    readonly delta: number;
    readonly interventionScore: number;
    readonly interventionRequired: boolean;
}

/** Evaluates objective movement from the persisted current/previous progress baseline. */
export class ExecutiveObjectiveProgressTrendScorer {
    score(objective: ExecutiveObjectiveRecord): ObjectiveProgressTrendScore {
        if (objective.previousProgress === undefined) {
            return {
                objectiveId: objective.id,
                trend: "UNKNOWN",
                delta: 0,
                interventionScore: 10,
                interventionRequired: false,
            };
        }

        const delta = objective.progress - objective.previousProgress;
        if (delta > 0) {
            return {
                objectiveId: objective.id,
                trend: "IMPROVING",
                delta,
                interventionScore: 0,
                interventionRequired: false,
            };
        }

        if (delta < 0) {
            return {
                objectiveId: objective.id,
                trend: "REGRESSING",
                delta,
                interventionScore: 50,
                interventionRequired: true,
            };
        }

        return {
            objectiveId: objective.id,
            trend: "STAGNANT",
            delta: 0,
            interventionScore: 30,
            interventionRequired: true,
        };
    }
}
