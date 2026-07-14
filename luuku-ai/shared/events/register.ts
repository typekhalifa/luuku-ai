import { eventBus } from "./core/event-bus";

import { ProspectRegisteredEvent } from "./events/prospect-registered.event";

import { ExecutiveReviewCompletedEvent } from "./events/executive-review-completed.event";

import { consoleHandler } from "./handlers/console.handler";

import { executiveHandler } from "./handlers/executive.handler";

import { salesHandler } from "./handlers/sales.handler";

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

    eventBus.subscribe(

        ExecutiveReviewCompletedEvent.TYPE,

        salesHandler

    );

    registered = true;

}