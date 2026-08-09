import { DomainEvent } from "../models/domain-event";

export interface EventSubscriber {

    subscribe(
        eventType: string,
        handler: (
            event: DomainEvent
        ) => Promise<void>
    ): void;

}