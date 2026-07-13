import { eventBus } from "./core/event-bus";

import { ProspectRegisteredEvent } from "./events/prospect-registered.event";

import { consoleHandler } from "./handlers/console.handler";
import { executiveHandler } from "./handlers/executive.handler";

let registered = false;

export function registerEventHandlers(): void {

    if (registered) {

        return;

    }

    eventBus.subscribe(

        ProspectRegisteredEvent.TYPE,

        consoleHandler

    );

    eventBus.subscribe(

        ProspectRegisteredEvent.TYPE,

        executiveHandler

    );

    registered = true;

}