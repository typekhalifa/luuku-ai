import { DomainEvent } from "../models/domain-event";
import { EventStore } from "./event-store";

export class InMemoryEventStore
    implements EventStore {

    private readonly events: DomainEvent[] = [];

    async append<T>(
        event: DomainEvent<T>
    ): Promise<void> {

        this.events.push(event);

    }

    async getAll(): Promise<DomainEvent[]> {

        return [...this.events];

    }

    async getByType(
        type: string
    ): Promise<DomainEvent[]> {

        return this.events.filter(
            event => event.type === type
        );

    }

}