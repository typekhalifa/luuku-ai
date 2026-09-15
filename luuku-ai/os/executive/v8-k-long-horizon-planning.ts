import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";

export type StrategicHorizon = "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";

export interface LongHorizonMilestone {
    readonly id: string;
    readonly objectiveId: string;
    readonly title: string;
    readonly horizon: StrategicHorizon;
    readonly targetProgress: number;
}

export interface LongHorizonObjectiveInput {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
    readonly horizon: StrategicHorizon;
    readonly dependsOnObjectiveIds?: readonly string[];
    readonly conflictsWithObjectiveIds?: readonly string[];
    readonly milestones?: readonly LongHorizonMilestone[];
}

export interface LongHorizonObjective {
    readonly objectiveId: string;
    readonly title: string;
    readonly horizon: StrategicHorizon;
    readonly strategicScore: number;
    readonly dependencyIds: readonly string[];
    readonly conflictIds: readonly string[];
    readonly milestones: readonly LongHorizonMilestone[];
}

export interface LongHorizonPlan {
    readonly generatedAt: Date;
    readonly objectives: readonly LongHorizonObjective[];
    readonly dependencyOrder: readonly string[];
    readonly milestones: readonly LongHorizonMilestone[];
    readonly conflicts: readonly { objectiveId: string; conflictWith: string }[];
}

const horizonWeight: Record<StrategicHorizon, number> = { SHORT_TERM: 30, MEDIUM_TERM: 20, LONG_TERM: 10 };
const priorityWeight: Record<ExecutiveObjectiveRecord["priority"], number> = { high: 30, medium: 20, low: 10 };

/** V8-K structures long-horizon company strategy without creating, approving, allocating, or executing work. */
export class ExecutiveLongHorizonPlanningEngine {
    build(inputs: readonly LongHorizonObjectiveInput[], now = new Date()): LongHorizonPlan {
        const ids = new Set<string>();
        for (const input of inputs) {
            if (ids.has(input.objective.id)) throw new Error(`Long-horizon planning failed: duplicate objective ${input.objective.id}.`);
            ids.add(input.objective.id);
        }

        const objectives = inputs.map((input) => {
            const dependencyIds = [...new Set(input.dependsOnObjectiveIds ?? [])].sort();
            const conflictIds = [...new Set(input.conflictsWithObjectiveIds ?? [])].sort();
            for (const dependencyId of dependencyIds) {
                if (!ids.has(dependencyId)) throw new Error(`Long-horizon planning failed: unknown dependency ${dependencyId}.`);
                if (dependencyId === input.objective.id) throw new Error(`Long-horizon planning failed: objective ${input.objective.id} cannot depend on itself.`);
            }
            for (const conflictId of conflictIds) {
                if (!ids.has(conflictId)) throw new Error(`Long-horizon planning failed: unknown conflict ${conflictId}.`);
                if (conflictId === input.objective.id) throw new Error(`Long-horizon planning failed: objective ${input.objective.id} cannot conflict with itself.`);
            }
            const milestones = [...(input.milestones ?? [])].map((milestone) => {
                if (milestone.objectiveId !== input.objective.id) throw new Error(`Long-horizon planning failed: milestone ${milestone.id} belongs to another objective.`);
                if (milestone.targetProgress < 0 || milestone.targetProgress > 100) throw new Error(`Long-horizon planning failed: milestone ${milestone.id} target must be between 0 and 100.`);
                return { ...milestone };
            }).sort((left, right) => left.targetProgress - right.targetProgress || left.id.localeCompare(right.id));

            return {
                objectiveId: input.objective.id,
                title: input.objective.title,
                horizon: input.horizon,
                strategicScore: priorityWeight[input.objective.priority] + horizonWeight[input.horizon] + input.urgency.score + input.progressTrend.interventionScore + (input.assessment.attentionRequired ? 20 : 0),
                dependencyIds,
                conflictIds,
                milestones,
            };
        }).sort((left, right) => right.strategicScore - left.strategicScore || left.objectiveId.localeCompare(right.objectiveId));

        return {
            generatedAt: now,
            objectives,
            dependencyOrder: this.resolveDependencyOrder(objectives),
            milestones: objectives.flatMap((objective) => objective.milestones),
            conflicts: this.resolveConflicts(objectives),
        };
    }

    private resolveDependencyOrder(objectives: readonly LongHorizonObjective[]): readonly string[] {
        const byId = new Map(objectives.map((objective) => [objective.objectiveId, objective]));
        const visiting = new Set<string>();
        const visited = new Set<string>();
        const order: string[] = [];
        const visit = (id: string): void => {
            if (visited.has(id)) return;
            if (visiting.has(id)) throw new Error(`Long-horizon planning failed: dependency cycle detected at ${id}.`);
            visiting.add(id);
            for (const dependencyId of byId.get(id)?.dependencyIds ?? []) visit(dependencyId);
            visiting.delete(id);
            visited.add(id);
            order.push(id);
        };
        for (const objective of objectives) visit(objective.objectiveId);
        return order;
    }

    private resolveConflicts(objectives: readonly LongHorizonObjective[]): readonly { objectiveId: string; conflictWith: string }[] {
        const conflicts: Array<{ objectiveId: string; conflictWith: string }> = [];
        const seen = new Set<string>();
        for (const objective of objectives) for (const conflictWith of objective.conflictIds) {
            const key = [objective.objectiveId, conflictWith].sort().join("::");
            if (seen.has(key)) continue;
            seen.add(key);
            conflicts.push({ objectiveId: objective.objectiveId, conflictWith });
        }
        return conflicts;
    }
}
