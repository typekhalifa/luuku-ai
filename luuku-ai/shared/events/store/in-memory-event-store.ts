import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../../orchestration/ownership.js";
import { DomainEvent } from "../models/domain-event";
import { EventStore } from "./event-store";

export class InMemoryEventStore implements EventStore {
    private readonly events: DomainEvent[] = [];
    private readonly ownership: ExecutionOwnership;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = normalizeExecutionOwnership(ownership);
    }

    async append<T>(event: DomainEvent<T>): Promise<void> {
        const normalized = {
            ...event,
            ownership: normalizeExecutionOwnership(event.ownership),
        };

        if (!ownershipMatches(this.ownership, normalized.ownership)) {
            throw new Error("Event store ownership mismatch.");
        }

        this.events.push(normalized);
    }

    async getAll(): Promise<DomainEvent[]> {
        return this.events
            .filter(event => ownershipMatches(this.ownership, event.ownership))
            .map(event => structuredClone(event));
    }

    async getByType(type: string): Promise<DomainEvent[]> {
        return this.events
            .filter(event =>
                event.type === type &&
                ownershipMatches(this.ownership, event.ownership),
            )
            .map(event => structuredClone(event));
    }
}
