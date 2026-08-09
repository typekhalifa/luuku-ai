import { CollaborationEvent } from "./event";

import { EventBus } from "./event-bus";

import { EventHandler } from "./event-handler";

export class InMemoryEventBus

    implements EventBus {

    private readonly subscriptions =

        new Map<string, EventHandler[]>();

    subscribe(

        eventType: string,

        handler: EventHandler

    ): void {

        const handlers =

            this.subscriptions.get(

                eventType

            ) ?? [];

        handlers.push(handler);

        this.subscriptions.set(

            eventType,

            handlers

        );

    }

    async publish(

        event: CollaborationEvent

    ): Promise<void> {

        const handlers =

            this.subscriptions.get(

                event.type

            ) ?? [];

        for (

            const handler of handlers

        ) {

            await handler.handle(

                event

            );

        }

    }

}