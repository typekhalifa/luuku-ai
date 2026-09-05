import type { ExecutiveObjectiveRecord } from "./objective-engine.js";
import type { ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";

export type StrategicHorizon = "SHORT_TERM" | "MEDIUM_TERM" | "LONG_TERM";

export interface StrategicObjectiveInput {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
    readonly dependsOnObjectiveIds?: readonly string[];
    readonly conflictsWithObjectiveIds?: readonly string[];
    readonly horizon?: StrategicHorizon;
}

export interface StrategicObjective {
    readonly objectiveId: string;
    readonly title: string;
    readonly priority: ExecutiveObjectiveRecord["priority"];
    readonly horizon: StrategicHorizon;
    readonly strategicScore: number;
    readonly dependencyIds: readonly string[];
    readonly conflictIds: readonly string[];
}

export interface StrategicPlan {
    readonly generatedAt: Date;
    readonly horizon: StrategicHorizon;
    readonly objectives: readonly StrategicObjective[];
    readonly dependencyOrder: readonly string[];
    readonly conflicts: readonly { objectiveId: string; conflictWith: string }[];
}

const priorityWeight: Record<ExecutiveObjectiveRecord["priority"], number> = {
    high: 30,
    medium: 20,
    low: 10,
};

const horizonWeight: Record<StrategicHorizon, number> = {
    SHORT_TERM: 30,
    MEDIUM_TERM: 20,
    LONG_TERM: 10,
};

/**
 * Produces a deterministic company-level objective strategy. It coordinates
 * objectives without creating tasks, approvals, queue items, or executions.
 */
export class ExecutiveStrategicPlanningEngine {
    build(inputs: readonly StrategicObjectiveInput[], now = new Date()): StrategicPlan {
        const ids = new Set<string>();
        for (const input of inputs) {
            if (ids.has(input.objective.id)) {
                throw new Error(`Strategic planning failed: duplicate objective ${input.objective.id}.`);
            }
            ids.add(input.objective.id);
        }

        const objectives = inputs.map((input) => {
            const horizon = input.horizon ?? "MEDIUM_TERM";
            const dependencyIds = [...(input.dependsOnObjectiveIds ?? [])].sort();
            const conflictIds = [...(input.conflictsWithObjectiveIds ?? [])].sort();

            for (const dependencyId of dependencyIds) {
                if (!ids.has(dependencyId)) throw new Error(`Strategic planning failed: unknown dependency ${dependencyId}.`);
                if (dependencyId === input.objective.id) throw new Error(`Strategic planning failed: objective ${input.objective.id} cannot depend on itself.`);
            }
            for (const conflictId of conflictIds) {
                if (!ids.has(conflictId)) throw new Error(`Strategic planning failed: unknown conflict ${conflictId}.`);
                if (conflictId === input.objective.id) throw new Error(`Strategic planning failed: objective ${input.objective.id} cannot conflict with itself.`);
            }

            const strategicScore =
                priorityWeight[input.objective.priority] +
                horizonWeight[horizon] +
                input.urgency.score +
                input.progressTrend.interventionScore +
                (input.assessment.attentionRequired ? 20 : 0);

            return {
                objectiveId: input.objective.id,
                title: input.objective.title,
                priority: input.objective.priority,
                horizon,
                strategicScore,
                dependencyIds,
                conflictIds,
            };
        }).sort((left, right) => {
            const scoreDifference = right.strategicScore - left.strategicScore;
            if (scoreDifference !== 0) return scoreDifference;
            return left.objectiveId.localeCompare(right.objectiveId);
        });

        const dependencyOrder = this.resolveDependencyOrder(objectives);
        const conflicts: Array<{ objectiveId: string; conflictWith: string }> = [];
        const seenConflicts = new Set<string>();
        for (const objective of objectives) {
            for (const conflictWith of objective.conflictIds) {
                const key = [objective.objectiveId, conflictWith].sort().join("::");
                if (seenConflicts.has(key)) continue;
                seenConflicts.add(key);
                conflicts.push({ objectiveId: objective.objectiveId, conflictWith });
            }
        }

        return {
            generatedAt: now,
            horizon: objectives[0]?.horizon ?? "MEDIUM_TERM",
            objectives,
            dependencyOrder,
            conflicts,
        };
    }

    private resolveDependencyOrder(objectives: readonly StrategicObjective[]): readonly string[] {
        const byId = new Map(objectives.map((objective) => [objective.objectiveId, objective]));
        const visiting = new Set<string>();
        const visited = new Set<string>();
        const order: string[] = [];

        const visit = (id: string): void => {
            if (visited.has(id)) return;
            if (visiting.has(id)) throw new Error(`Strategic planning failed: dependency cycle detected at ${id}.`);
            visiting.add(id);
            for (const dependencyId of byId.get(id)?.dependencyIds ?? []) visit(dependencyId);
            visiting.delete(id);
            visited.add(id);
            order.push(id);
        };

        for (const objective of objectives) visit(objective.objectiveId);
        return order;
    }
}
