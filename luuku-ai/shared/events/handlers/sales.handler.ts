import { EventHandler } from "../core/event-handler";

import { ExecutiveReviewCompletedEvent } from "../events/executive-review-completed.event";

export class SalesHandler
    implements EventHandler<ExecutiveReviewCompletedEvent> {

    async handle(

        event: ExecutiveReviewCompletedEvent

    ): Promise<void> {

        console.log("");

        console.log("======================================");
        console.log(" SALES");
        console.log("======================================");
        console.log("");

        console.log(`Company         : ${event.companyName}`);

        console.log(`Priority        : ${event.priority}`);

        console.log(`Owner           : ${event.ownerAgent}`);

        console.log(`Next Action     : ${event.nextAction}`);

        console.log(`Estimated Value : $${event.estimatedValue}`);

        console.log("");

    }

}

export const salesHandler =
    new SalesHandler();