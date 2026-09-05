import type { CapabilityResolver } from "../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import { ExecutiveObjectiveIntentBridge } from "./objective-intent-bridge.js";
import type { ExecutiveObjectiveRecord, ExecutiveObjectiveStore, ObjectiveAssessment } from "./objective-engine.js";
import type { ExecutiveState } from "./executive-state.js";
import { ExecutiveIntentPlanBuilder } from "../planning/intent-plan-builder.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveIntent } from "./executive-intent.js";

export interface ObjectiveDrivenCycleResult {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly intent: ExecutiveIntent;
    readonly plan?: ExecutionPlan;
}

/**
 * Connects durable business objectives to the existing executive intent/plan
 * boundary. It deliberately stops before autonomy policy, submission, queueing,
 * or execution; the existing autonomous executive cycle remains authoritative
 * for those stages.
 */
export class ObjectiveDrivenExecutiveCycle {
    private readonly intentBridge = new ExecutiveObjectiveIntentBridge();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;

    constructor(
        private readonly objectiveStore: ExecutiveObjectiveStore,
        capabilityResolver: CapabilityResolver,
    ) {
        this.planBuilder = new ExecutiveIntentPlanBuilder(capabilityResolver);
    }

    async run(
        state: ExecutiveState,
        capabilities: IntentPlanCapabilityMap,
    ): Promise<readonly ObjectiveDrivenCycleResult[]> {
        const objectives = await this.objectiveStore.list();
        const results: ObjectiveDrivenCycleResult[] = [];

        for (const objective of objectives) {
            const assessment = await this.assess(objective, state);
            const intent = this.intentBridge.build({ objective, assessment });

            if (intent.type === "NO_ACTION" || intent.type === "WAIT_FOR_FOUNDER_DECISION" || intent.type === "MONITOR_ACTIVE_WORK") {
                results.push({ objective, assessment, intent });
                continue;
            }

            const plan = this.planBuilder.build({ intent, capabilities });
            results.push({ objective, assessment, intent, plan });
        }

        return results;
    }

    private async assess(
        objective: ExecutiveObjectiveRecord,
        state: ExecutiveState,
    ): Promise<ObjectiveAssessment> {
        if (objective.status === "COMPLETED") {
            return {
                objectiveId: objective.id,
                status: objective.status,
                progress: objective.progress,
                attentionRequired: false,
                reason: "Objective is already completed.",
            };
        }
        if (objective.status === "PAUSED") {
            return {
                objectiveId: objective.id,
                status: objective.status,
                progress: objective.progress,
                attentionRequired: false,
                reason: "Objective is paused.",
            };
        }
        if (state.failed > 0) {
            return {
                objectiveId: objective.id,
                status: objective.status,
                progress: objective.progress,
                attentionRequired: true,
                reason: "Objective remains active while failed work requires executive attention.",
            };
        }
        if (state.waitingApproval > 0) {
            return {
                objectiveId: objective.id,
                status: objective.status,
                progress: objective.progress,
                attentionRequired: true,
                reason: "Objective remains active while founder approval is pending.",
            };
        }
        return {
            objectiveId: objective.id,
            status: objective.status,
            progress: objective.progress,
            attentionRequired: true,
            reason: "Objective is active and requires the executive to determine its next useful work.",
        };
    }
}
