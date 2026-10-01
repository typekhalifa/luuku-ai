import type { StrategicPlan } from "./strategic-planning-engine.js";
import type { CompanyStateAdaptiveInterventionDecision } from "./v8-j-adaptive-intervention.js";
import type { ExecutiveAdaptiveCompanyStateCoordinatorResult } from "./v8-j-adaptive-company-state-coordinator.js";

export interface AdaptiveInterventionPlanningHandoff {
    readonly decision: CompanyStateAdaptiveInterventionDecision;
    readonly strategicObjectiveId: string;
    readonly planningRequired: boolean;
    readonly reason: string;
}

export interface AdaptiveInterventionPlanningHandoffResult {
    readonly generatedAt: Date;
    readonly handoffs: readonly AdaptiveInterventionPlanningHandoff[];
    readonly unresolvedSignalIds: readonly string[];
}

/**
 * Converts already-authorized V8-J adaptive decisions into planning handoff
 * records. It does not build plans or execute work; StrategicPlanningEngine
 * remains the planning authority.
 */
export class ExecutiveAdaptiveInterventionPlanningHandoff {
    build(
        coordination: ExecutiveAdaptiveCompanyStateCoordinatorResult,
        plan?: StrategicPlan,
    ): AdaptiveInterventionPlanningHandoffResult {
        const objectiveIds = new Set(plan?.objectives.map((objective) => objective.objectiveId) ?? []);
        const handoffs = coordination.decisions
            .filter((decision) => objectiveIds.size === 0 || objectiveIds.has(decision.objectiveId))
            .map((decision) => ({
                decision,
                strategicObjectiveId: decision.objectiveId,
                planningRequired: decision.mode !== "CONTINUE",
                reason: decision.mode === "CONTINUE"
                    ? "Adaptive policy supports continuing the current approach."
                    : `Adaptive policy selected ${decision.mode}; planning should determine the next bounded work sequence.`,
            }));

        return {
            generatedAt: new Date(),
            handoffs,
            unresolvedSignalIds: coordination.unresolved.map((item) => item.signalId),
        };
    }
}
