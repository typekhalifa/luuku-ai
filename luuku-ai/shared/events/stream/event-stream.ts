import { DomainEvent } from "../models/domain-event";

export interface EventStream {

    publish<T>(
        event: DomainEvent<T>
    ): Promise<void>;

    subscribe(
        eventType: string,
        handler: (
            event: DomainEvent
        ) => Promise<void>
    ): void;

}