import { DomainEvent } from "../models/domain-event";

export interface EventPublisher {

    publish<T>(
        event: DomainEvent<T>
    ): Promise<void>;

}