import { Event } from "./event";

export interface EventHandler<T extends Event = Event> {

    handle(

        event: T

    ): Promise<void>;

}