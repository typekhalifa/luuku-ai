import type { ExecutiveObjective } from "../../shared/executive/objectives.js";
import type { ExecutiveState } from "./executive-state.js";

export type ExecutiveObjectiveStatus = "ACTIVE" | "PAUSED" | "COMPLETED";

export interface ExecutiveObjectiveRecord extends ExecutiveObjective {
    readonly id: string;
    readonly status: ExecutiveObjectiveStatus;
    readonly progress: number;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface ExecutiveObjectiveStore {
    get(id: string): Promise<ExecutiveObjectiveRecord | undefined>;
    list(): Promise<readonly ExecutiveObjectiveRecord[]>;
    save(objective: ExecutiveObjectiveRecord): Promise<void>;
}

export interface ObjectiveAssessment {
    readonly objectiveId: string;
    readonly status: ExecutiveObjectiveStatus;
    readonly progress: number;
    readonly attentionRequired: boolean;
    readonly reason: string;
}

/**
 * Durable objective layer. It owns objective state and assessment only; it does
 * not choose an agent, approve work, enqueue work, or execute anything.
 */
export class ExecutiveObjectiveEngine {
    constructor(private readonly store: ExecutiveObjectiveStore) {}

    async listActive(): Promise<readonly ExecutiveObjectiveRecord[]> {
        const objectives = await this.store.list();
        return objectives.filter((objective) => objective.status === "ACTIVE");
    }

    async assess(objective: ExecutiveObjectiveRecord, state: ExecutiveState): Promise<ObjectiveAssessment> {
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

        if (state.approval > 0) {
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

export class InMemoryExecutiveObjectiveStore implements ExecutiveObjectiveStore {
    private readonly objectives = new Map<string, ExecutiveObjectiveRecord>();

    async get(id: string): Promise<ExecutiveObjectiveRecord | undefined> {
        const objective = this.objectives.get(id);
        return objective ? structuredClone(objective) : undefined;
    }

    async list(): Promise<readonly ExecutiveObjectiveRecord[]> {
        return structuredClone([...this.objectives.values()]);
    }

    async save(objective: ExecutiveObjectiveRecord): Promise<void> {
        if (this.objectives.has(objective.id)) {
            const existing = this.objectives.get(objective.id)!;
            if (existing.title !== objective.title || existing.description !== objective.description) {
                throw new Error(`Objective ${objective.id} already exists with different identity.`);
            }
        }
        this.objectives.set(objective.id, structuredClone(objective));
    }
}
