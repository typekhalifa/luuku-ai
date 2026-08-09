import { DomainEvent } from "../models/domain-event";
import { EventHandler } from "./event-handler";

export interface EventBus {

    publish<T>(
        event: DomainEvent<T>
    ): Promise<void>;

    subscribe(
        eventType: string,
        handler: EventHandler
    ): void;

}