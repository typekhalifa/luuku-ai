import { EventHandler } from "./event-handler";

export interface EventSubscription {

    eventType: string;

    handler: EventHandler;

}