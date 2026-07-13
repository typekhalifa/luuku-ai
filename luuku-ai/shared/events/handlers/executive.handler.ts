import { EventHandler } from "../core/event-handler";

import { ProspectRegisteredEvent } from "../events/prospect-registered.event";

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

        console.log(

            `Reviewing ${event.companyName}`

        );

        console.log(

            "Priority : Normal"

        );

        console.log(

            "Decision : Queue Sales Review"

        );

        console.log("");

    }

}

export const executiveHandler =
    new ExecutiveHandler();