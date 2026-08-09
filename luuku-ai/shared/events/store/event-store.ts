import { DomainEvent } from "../models/domain-event";

export interface EventStore {

    append<T>(
        event: DomainEvent<T>
    ): Promise<void>;

    getAll(): Promise<DomainEvent[]>;

    getByType(
        type: string
    ): Promise<DomainEvent[]>;

}