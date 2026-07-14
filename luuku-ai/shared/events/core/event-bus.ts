import { Event } from "./event";
import { EventHandler } from "./event-handler";
import { eventHistory } from "../history/event-history";

export class EventBus {

    private readonly handlers =
        new Map<string, EventHandler[]>();

    subscribe(

        eventType: string,

        handler: EventHandler

    ): void {

        const handlers =

            this.handlers.get(

                eventType

            ) ?? [];

        handlers.push(handler);

        this.handlers.set(

            eventType,

            handlers

        );

    }

    async publish(

        event: Event

    ): Promise<void> {

        console.log("");

        console.log("======================================");

        console.log(" EVENT BUS");

        console.log("======================================");

        console.log("");

        console.log(`Publishing : ${event.type}`);

        console.log(`Version    : ${event.version}`);

        eventHistory.record(

            event

        );

        console.log("");

        const handlers =

            this.handlers.get(

                event.type

            ) ?? [];

        for (

            const handler

            of handlers

        ) {

            await handler.handle(

                event

            );

        }

        console.log(

            `Delivered to ${handlers.length} handler(s).`

        );

        console.log("");

    }

}

export const eventBus =
    new EventBus();