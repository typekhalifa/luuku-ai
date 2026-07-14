import { EventHandler } from "../core/event-handler";

import { eventBus } from "../core/event-bus";

import { ProspectRegisteredEvent } from "../events/prospect-registered.event";

import { ExecutiveReviewCompletedEvent } from "../events/executive-review-completed.event";

export class ExecutiveHandler
    implements EventHandler<ProspectRegisteredEvent> {

    async handle(

        event: ProspectRegisteredEvent

    ): Promise<void> {

        console.log("");

        console.log("======================================");
        console.log(" EXECUTIVE");
        console.log("======================================");
        console.log("");

        console.log(`Reviewing ${event.companyName}`);

        console.log("Priority : Normal");

        console.log("Decision : Queue Sales Review");

        console.log("");

        await eventBus.publish(

            new ExecutiveReviewCompletedEvent(

                {

                    workflowId:
                        event.context.workflowId,

                    agent:
                        "executive-agent",

                    correlationId:
                        event.context.correlationId,

                    causationId:
                        event.id

                },

                event.companyId,

                event.companyName,

                "normal",

                "sales-agent",

                "Initial Outreach",

                5000

            )

        );

    }

}

export const executiveHandler =
    new ExecutiveHandler();