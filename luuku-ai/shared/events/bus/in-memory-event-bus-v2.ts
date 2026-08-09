import { DomainEvent } from "../models/domain-event";

import { EventBus } from "./event-bus";

import { EventHandler } from "./event-handler";

import { EventStore } from "../store/event-store";

export class InMemoryEventBusV2
    implements EventBus {

    private readonly subscriptions =
        new Map<string, EventHandler[]>();

    constructor(

        private readonly store: EventStore

    ) {}

    subscribe(

        eventType: string,

        handler: EventHandler

    ): void {

        const handlers =
            this.subscriptions.get(eventType) ?? [];

        handlers.push(handler);

        this.subscriptions.set(
            eventType,
            handlers
        );

    }

    async publish<T>(

        event: DomainEvent<T>

    ): Promise<void> {

        await this.store.append(event);

        const handlers =
            this.subscriptions.get(event.type) ?? [];

        for (const handler of handlers) {

            await handler(event);

        }

    }

}