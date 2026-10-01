import type { ExecutiveState } from "../executive/executive-state.js";
import type { ExecutiveDecision } from "../executive/decision-surface.js";

export interface DurableControlState {
    version: number;
    executiveState: ExecutiveState;
    decisions: readonly ExecutiveDecision[];
    updatedAt: Date;
}

export interface ControlStateStore {
    save(state: DurableControlState): Promise<void>;
    load(): Promise<DurableControlState | undefined>;
}

export class InMemoryControlStateStore implements ControlStateStore {
    private state?: DurableControlState;

    async save(state: DurableControlState): Promise<void> {
        this.state = structuredClone(state);
    }

    async load(): Promise<DurableControlState | undefined> {
        return this.state ? structuredClone(this.state) : undefined;
    }
}
