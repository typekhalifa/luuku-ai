import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";
import { ExecutiveStrategicPlanningEngine, type StrategicObjectiveInput, type StrategicPlan } from "./strategic-planning-engine.js";

export type LongHorizonPlanningHorizon = "LONG_TERM";

export type LongHorizonReplanTrigger =
    | "OBJECTIVE_CHANGE"
    | "SIGNIFICANT_REGRESSION"
    | "NEW_DEPENDENCY"
    | "STRATEGIC_CONFLICT"
    | "MAJOR_EXTERNAL_CHANGE";

export interface LongHorizonObjectiveInput extends StrategicObjectiveInput {
    readonly targetState: string;
    readonly milestoneIds?: readonly string[];
}

export interface LongHorizonMilestone {
    readonly id: string;
    readonly objectiveId: string;
    readonly title: string;
    readonly sequence: number;
    readonly dependencyObjectiveIds: readonly string[];
    readonly targetState: string;
}

export interface LongHorizonPlan {
    readonly generatedAt: Date;
    readonly horizon: LongHorizonPlanningHorizon;
    readonly strategicPlan: StrategicPlan;
    readonly milestones: readonly LongHorizonMilestone[];
    readonly replanTriggers: readonly LongHorizonReplanTrigger[];
    readonly executionBoundary: "PLAN_ONLY";
}

/** V8-K creates a bounded long-horizon company direction from explicit objectives. It plans future state and milestones but never creates work, allocates resources, approves actions, or executes. */
export class ExecutiveLongHorizonPlanningEngine {
    constructor(private readonly strategicPlanner = new ExecutiveStrategicPlanningEngine()) {}

    build(inputs: readonly LongHorizonObjectiveInput[], now = new Date()): LongHorizonPlan {
        for (const input of inputs) {
            if (!input.targetState.trim()) {
                throw new Error(`Long-horizon planning failed: objective ${input.objective.id} requires an explicit target state.`);
            }
        }

        const strategicInputs: StrategicObjectiveInput[] = inputs.map((input) => ({
            ...input,
            horizon: "LONG_TERM",
        }));
        const strategicPlan = this.strategicPlanner.build(strategicInputs, now);
        const inputById = new Map(inputs.map((input) => [input.objective.id, input]));

        const milestones = strategicPlan.dependencyOrder.map((objectiveId, index) => {
            const input = inputById.get(objectiveId);
            if (!input) throw new Error(`Long-horizon planning failed: missing objective ${objectiveId}.`);
            return {
                id: input.milestoneIds?.[0] ?? `milestone-${objectiveId}`,
                objectiveId,
                title: `Reach target state for ${input.objective.title}`,
                sequence: index + 1,
                dependencyObjectiveIds: input.dependsOnObjectiveIds ?? [],
                targetState: input.targetState,
            };
        });

        return {
            generatedAt: now,
            horizon: "LONG_TERM",
            strategicPlan,
            milestones,
            replanTriggers: [
                "OBJECTIVE_CHANGE",
                "SIGNIFICANT_REGRESSION",
                "NEW_DEPENDENCY",
                "STRATEGIC_CONFLICT",
                "MAJOR_EXTERNAL_CHANGE",
            ],
            executionBoundary: "PLAN_ONLY",
        };
    }
}

export type { ExecutiveObjectiveRecord, ObjectiveAssessment, ObjectiveProgressTrendScore, ObjectiveUrgencyScore };
