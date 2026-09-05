import type { ExecutiveIntent } from "./executive-intent.js";
import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveIntervention } from "./objective-intervention.js";

export interface ObjectiveIntentBridgeRequest {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly intervention?: ObjectiveIntervention;
}

/**
 * Converts an assessed objective into structured executive intent.
 * This boundary selects no agent, creates no plan, and performs no execution.
 */
export class ExecutiveObjectiveIntentBridge {
    build(request: ObjectiveIntentBridgeRequest): ExecutiveIntent {
        const { objective, assessment, intervention } = request;

        if (assessment.objectiveId !== objective.id) {
            throw new Error(
                `Objective intent bridge failed: assessment ${assessment.objectiveId} does not match objective ${objective.id}.`,
            );
        }

        if (intervention && intervention.objectiveId !== objective.id) {
            throw new Error(
                `Objective intent bridge failed: intervention ${intervention.objectiveId} does not match objective ${objective.id}.`,
            );
        }

        if (intervention && intervention.type !== "NO_INTERVENTION") {
            const type = intervention.type === "RECOVER_FAILED_WORK"
                ? "RECOVER_FAILED_WORK"
                : "INTERVENE_OBJECTIVE";

            return {
                id: `objective-${intervention.type.toLowerCase()}-${objective.id}`,
                type,
                objective: objective.title,
                reason: intervention.reason,
                sourceObservationIds: [],
                evidence: {
                    ...intervention.evidence,
                    interventionType: intervention.type,
                },
            };
        }

        if (!assessment.attentionRequired) {
            return {
                id: `objective-no-action-${objective.id}`,
                type: "NO_ACTION",
                objective: objective.title,
                reason: assessment.reason,
                sourceObservationIds: [],
                evidence: {
                    source: "executive-objective",
                    objectiveId: objective.id,
                    objectiveStatus: assessment.status,
                    progress: assessment.progress,
                    assessmentStatus: assessment.status,
                },
            };
        }

        const type = assessment.reason.toLowerCase().includes("failed work")
            ? "RECOVER_FAILED_WORK"
            : assessment.reason.toLowerCase().includes("founder approval")
                ? "WAIT_FOR_FOUNDER_DECISION"
                : "MONITOR_ACTIVE_WORK";

        return {
            id: `objective-${objective.id}`,
            type,
            objective: objective.title,
            reason: assessment.reason,
            sourceObservationIds: [],
            evidence: {
                source: "executive-objective",
                objectiveId: objective.id,
                objectiveStatus: assessment.status,
                progress: assessment.progress,
                assessmentStatus: assessment.status,
            },
        };
    }
}
