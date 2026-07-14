import { Event } from "../core/event";

export class EventHistory {

    private readonly events: Event[] = [];

    record(

        event: Event

    ): void {

        this.events.push(event);

    }

    getAll(): readonly Event[] {

        return this.events;

    }

    clear(): void {

        this.events.length = 0;

    }

}

export const eventHistory =
    new EventHistory();