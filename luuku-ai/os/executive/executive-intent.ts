import type {
    ExecutiveObservation,
    ExecutiveObservationSnapshot,
} from "./executive-observation.js";

export type ExecutiveIntentType =
    | "RECOVER_FAILED_WORK"
    | "WAIT_FOR_FOUNDER_DECISION"
    | "MONITOR_ACTIVE_WORK"
    | "INTERVENE_OBJECTIVE"
    | "NO_ACTION";

export interface ExecutiveIntent {
    id: string;
    type: ExecutiveIntentType;
    objective: string;
    reason: string;
    sourceObservationIds: readonly string[];
    evidence: Record<string, unknown>;
}

export interface ExecutiveIntentSnapshot {
    generatedAt: Date;
    intents: readonly ExecutiveIntent[];
}

/** Pure executive intent layer: translates observed facts into structured intent, never execution policy or actions. */
export class ExecutiveIntentProjector {
    derive(snapshot: ExecutiveObservationSnapshot): ExecutiveIntentSnapshot {
        const intents = snapshot.observations.map((observation) => this.fromObservation(observation));

        return {
            generatedAt: new Date(),
            intents,
        };
    }

    private fromObservation(observation: ExecutiveObservation): ExecutiveIntent {
        switch (observation.type) {
            case "FAILED_WORK":
                return {
                    id: "recover-failed-work",
                    type: "RECOVER_FAILED_WORK",
                    objective: "Investigate and recover failed work.",
                    reason: observation.message,
                    sourceObservationIds: [observation.id],
                    evidence: { ...observation.evidence },
                };
            case "PENDING_APPROVAL":
                return {
                    id: "wait-for-founder-decision",
                    type: "WAIT_FOR_FOUNDER_DECISION",
                    objective: "Await the founder decision on approval-blocked work.",
                    reason: observation.message,
                    sourceObservationIds: [observation.id],
                    evidence: { ...observation.evidence },
                };
            case "ACTIVE_WORK":
                return {
                    id: "monitor-active-work",
                    type: "MONITOR_ACTIVE_WORK",
                    objective: "Continue observing active work.",
                    reason: observation.message,
                    sourceObservationIds: [observation.id],
                    evidence: { ...observation.evidence },
                };
            case "NO_ACTIVE_WORK":
                return {
                    id: "no-action",
                    type: "NO_ACTION",
                    objective: "Take no action while there is no active attention-worthy work.",
                    reason: observation.message,
                    sourceObservationIds: [observation.id],
                    evidence: { ...observation.evidence },
                };
        }
    }
}
