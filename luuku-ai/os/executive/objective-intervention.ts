import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";

export type ObjectiveInterventionType =
    | "INVESTIGATE_STAGNATION"
    | "RECOVER_REGRESSION"
    | "RECOVER_FAILED_WORK"
    | "NO_INTERVENTION";

export interface ObjectiveInterventionRequest {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly progressTrend: ObjectiveProgressTrendScore;
}

export interface ObjectiveIntervention {
    readonly objectiveId: string;
    readonly type: ObjectiveInterventionType;
    readonly reason: string;
    readonly interventionRequired: boolean;
    readonly evidence: Readonly<Record<string, unknown>>;
}

/**
 * Determines the appropriate intervention for an objective without selecting
 * an agent, creating a plan, requesting approval, or executing any work.
 */
export class ExecutiveObjectiveInterventionEngine {
    assess(request: ObjectiveInterventionRequest): ObjectiveIntervention {
        const { objective, assessment, progressTrend } = request;

        if (assessment.objectiveId !== objective.id || progressTrend.objectiveId !== objective.id) {
            throw new Error(
                `Objective intervention failed: objective identity does not match assessment/trend for ${objective.id}.`,
            );
        }

        const evidence = {
            source: "executive-objective-intervention",
            objectiveId: objective.id,
            objectiveStatus: assessment.status,
            progress: assessment.progress,
            progressTrend: progressTrend.trend,
            progressDelta: progressTrend.delta,
            assessmentReason: assessment.reason,
        };

        if (assessment.reason.toLowerCase().includes("failed work")) {
            return {
                objectiveId: objective.id,
                type: "RECOVER_FAILED_WORK",
                reason: "Failed work exists and requires recovery before objective progress can resume.",
                interventionRequired: true,
                evidence,
            };
        }

        if (progressTrend.trend === "REGRESSING") {
            return {
                objectiveId: objective.id,
                type: "RECOVER_REGRESSION",
                reason: "Objective progress is regressing; investigate and correct the underlying operational bottleneck.",
                interventionRequired: true,
                evidence,
            };
        }

        if (progressTrend.trend === "STAGNANT") {
            return {
                objectiveId: objective.id,
                type: "INVESTIGATE_STAGNATION",
                reason: "Objective progress is stagnant; investigate the bottleneck and identify the next useful intervention.",
                interventionRequired: true,
                evidence,
            };
        }

        // An active objective with no existing failure or regression still
        // represents an autonomous work-selection opportunity. The executive
        // must be able to determine useful next work without waiting for a
        // user-created failure condition. Keep this as an explicit intervention
        // rather than collapsing the objective into MONITOR_ACTIVE_WORK.
        if (assessment.attentionRequired) {
            return {
                objectiveId: objective.id,
                type: "INVESTIGATE_STAGNATION",
                reason: "Objective is active and requires the executive to determine its next useful work.",
                interventionRequired: true,
                evidence,
            };
        }

        return {
            objectiveId: objective.id,
            type: "NO_INTERVENTION",
            reason: progressTrend.trend === "IMPROVING"
                ? "Objective progress is improving; no intervention is required."
                : "Objective progress trend is unknown; continue observation before intervening.",
            interventionRequired: false,
            evidence,
        };
    }
}
