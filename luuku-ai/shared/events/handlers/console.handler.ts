import { EventHandler } from "../core/event-handler";
import { ProspectRegisteredEvent } from "../events/prospect-registered.event";

export class ConsoleHandler
    implements EventHandler<ProspectRegisteredEvent> {

    async handle(

        event: ProspectRegisteredEvent

    ): Promise<void> {

        console.log("");

        console.log("======================================");

        console.log(" EVENT RECEIVED");

        console.log("======================================");

        console.log("");

        console.log("Type      :", event.type);
        console.log("Company   :", event.companyName);
        console.log("Workflow  :", event.context.workflowId);

        console.log("Agent     :", event.context.agent);

        console.log(

            "Correlation :",

            event.context.correlationId

        );
        console.log("Version   :", event.version);
        console.log("Occurred  :", event.occurredAt);

        console.log("");

    }

}

export const consoleHandler =
    new ConsoleHandler();