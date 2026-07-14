import crypto from "crypto";

import { EventContext } from "./event-context";

export abstract class Event {

    static readonly VERSION = 1;

    readonly id: string;

    readonly occurredAt: string;

    readonly version: number;

    protected constructor(

        public readonly type: string,

        public readonly context: EventContext

    ) {

        this.id = crypto.randomUUID();

        this.occurredAt = new Date().toISOString();

        this.version = Event.VERSION;

    }

}