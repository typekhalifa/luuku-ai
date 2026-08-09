import { CollaborationEvent } from "./event";

export interface EventHandler {

    handle(

        event: CollaborationEvent

    ): Promise<void>;

}