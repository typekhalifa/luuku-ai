import type { StrategicObjective } from "./strategic-planning-engine.js";

export interface StrategicObjectiveCoordinatorResult {
    readonly orderedObjectiveIds: readonly string[];
    readonly blockedObjectiveIds: readonly string[];
    readonly readyObjectiveIds: readonly string[];
}

/**
 * Applies strategic dependency ordering to determine which objectives are
 * currently unblocked. It does not create work or execute anything.
 */
export class ExecutiveStrategicObjectiveCoordinator {
    coordinate(objectives: readonly StrategicObjective[]): StrategicObjectiveCoordinatorResult {
        const completed = new Set<string>();
        const ready: string[] = [];
        const blocked: string[] = [];

        for (const objective of objectives) {
            const dependenciesSatisfied = objective.dependencyIds.every((dependencyId) => completed.has(dependencyId));
            if (dependenciesSatisfied) {
                ready.push(objective.objectiveId);
                completed.add(objective.objectiveId);
            } else {
                blocked.push(objective.objectiveId);
            }
        }

        return {
            orderedObjectiveIds: objectives.map((objective) => objective.objectiveId),
            blockedObjectiveIds: blocked,
            readyObjectiveIds: ready,
        };
    }
}
