import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import { ExecutiveStrategicPlanningEngine, type StrategicPlan, type StrategicObjectiveInput } from "./strategic-planning-engine.js";

export type StrategicHorizon = "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";
export type LongHorizonExecutionBoundary = "PLAN_ONLY";

export interface LongHorizonMilestone {
    readonly id: string;
    readonly objectiveId: string;
    readonly title: string;
    readonly horizon: StrategicHorizon;
    readonly targetProgress: number;
    readonly dependencyObjectiveIds?: readonly string[];
}

export interface LongHorizonObjectiveInput {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
    readonly horizon: StrategicHorizon;
    readonly targetState?: string;
    readonly dependsOnObjectiveIds?: readonly string[];
    readonly conflictsWithObjectiveIds?: readonly string[];
    readonly milestones?: readonly LongHorizonMilestone[];
}

export interface LongHorizonObjective {
    readonly objectiveId: string;
    readonly title: string;
    readonly targetState?: string;
    readonly horizon: StrategicHorizon;
    readonly strategicScore: number;
    readonly dependencyIds: readonly string[];
    readonly conflictIds: readonly string[];
    readonly milestones: readonly LongHorizonMilestone[];
}

export interface LongHorizonPlan {
    readonly generatedAt: Date;
    readonly horizon: StrategicHorizon;
    readonly strategicPlan: StrategicPlan;
    readonly objectives: readonly LongHorizonObjective[];
    readonly dependencyOrder: readonly string[];
    readonly milestones: readonly LongHorizonMilestone[];
    readonly conflicts: readonly { objectiveId: string; conflictWith: string }[];
    readonly executionBoundary: LongHorizonExecutionBoundary;
    readonly replanTriggers: readonly string[];
}

const REPLAN_TRIGGERS = [
    "OBJECTIVE_PROGRESS_CHANGED",
    "OBJECTIVE_STATUS_CHANGED",
    "DEPENDENCY_STATE_CHANGED",
    "STRATEGIC_CONFLICT_CHANGED",
    "EXECUTIVE_STATE_CHANGED",
] as const;

/**
 * V8-K structures long-horizon company strategy and re-planning signals.
 * It remains plan-only: it does not create, approve, allocate, or execute work.
 */
export class ExecutiveLongHorizonPlanningEngine {
    constructor(private readonly strategicPlanner = new ExecutiveStrategicPlanningEngine()) {}

    build(inputs: readonly LongHorizonObjectiveInput[], now = new Date()): LongHorizonPlan {
        const strategicInputs: StrategicObjectiveInput[] = inputs.map((input) => ({
            objective: input.objective,
            assessment: input.assessment,
            urgency: input.urgency,
            progressTrend: input.progressTrend,
            dependsOnObjectiveIds: input.dependsOnObjectiveIds,
            conflictsWithObjectiveIds: input.conflictsWithObjectiveIds,
            horizon: input.horizon,
        }));
        const strategicPlan = this.strategicPlanner.build(strategicInputs, now);
        const inputById = new Map(inputs.map((input) => [input.objective.id, input]));

        const objectives = strategicPlan.objectives.map((strategicObjective) => {
            const input = inputById.get(strategicObjective.objectiveId)!;
            const milestones = [...(input.milestones ?? [])].map((milestone) => {
                if (milestone.objectiveId !== input.objective.id) {
                    throw new Error(`Long-horizon planning failed: milestone ${milestone.id} belongs to another objective.`);
                }
                if (milestone.targetProgress < 0 || milestone.targetProgress > 100) {
                    throw new Error(`Long-horizon planning failed: milestone ${milestone.id} target must be between 0 and 100.`);
                }
                const dependencyObjectiveIds = [...new Set(
                    milestone.dependencyObjectiveIds ?? input.dependsOnObjectiveIds ?? [],
                )].sort();
                for (const dependencyId of dependencyObjectiveIds) {
                    if (!inputById.has(dependencyId)) {
                        throw new Error(`Long-horizon planning failed: unknown milestone dependency ${dependencyId}.`);
                    }
                    if (dependencyId === milestone.objectiveId) {
                        throw new Error(`Long-horizon planning failed: milestone ${milestone.id} cannot depend on its own objective.`);
                    }
                }
                return { ...milestone, dependencyObjectiveIds };
            }).sort((left, right) => left.targetProgress - right.targetProgress || left.id.localeCompare(right.id));

            return {
                objectiveId: strategicObjective.objectiveId,
                title: strategicObjective.title,
                targetState: input.targetState,
                horizon: strategicObjective.horizon,
                strategicScore: strategicObjective.strategicScore,
                dependencyIds: strategicObjective.dependencyIds,
                conflictIds: strategicObjective.conflictIds,
                milestones,
            };
        });

        return {
            generatedAt: now,
            horizon: "LONG_TERM",
            strategicPlan,
            objectives,
            dependencyOrder: strategicPlan.dependencyOrder,
            milestones: objectives.flatMap((objective) => objective.milestones),
            conflicts: strategicPlan.conflicts,
            executionBoundary: "PLAN_ONLY",
            replanTriggers: REPLAN_TRIGGERS,
        };
    }
}
