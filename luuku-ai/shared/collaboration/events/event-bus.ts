import { CollaborationEvent } from "./event";

import { EventHandler } from "./event-handler";

export interface EventBus {

    subscribe(

        eventType: string,

        handler: EventHandler

    ): void;

    publish(

        event: CollaborationEvent

    ): Promise<void>;

}