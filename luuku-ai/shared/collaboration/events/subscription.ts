import { EventHandler } from "./event-handler";

export interface Subscription {

    eventType: string;

    handler: EventHandler;

}