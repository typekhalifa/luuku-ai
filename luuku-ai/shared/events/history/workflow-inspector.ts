import { Event } from "../core/event";

import { eventHistory } from "./event-history";

export class WorkflowInspector {

    getTimeline(): readonly Event[] {

        return eventHistory

            .getAll()

            .slice()

            .sort(

                (a, b) =>

                    Date.parse(a.occurredAt)

                    -

                    Date.parse(b.occurredAt)

            );

    }

    printTimeline(): void {

        console.log("");

        console.log("==================================================");
        console.log(" WORKFLOW INSPECTOR");
        console.log("==================================================");
        console.log("");

        const events = this.getTimeline();

        events.forEach(

            (event, index) => {

                console.log(
                    `${index + 1}. ${event.type}`
                );

                console.log(
                    `   Agent       : ${event.context.agent}`
                );

                console.log(
                    `   Workflow    : ${event.context.workflowId}`
                );

                console.log(
                    `   Correlation : ${event.context.correlationId}`
                );

                if (event.context.causationId) {

                    console.log(
                        `   Caused By   : ${event.context.causationId}`
                    );

                }

                console.log(
                    `   Time        : ${event.occurredAt}`
                );

                console.log("");

            }

        );

    }
}

export const workflowInspector =
    new WorkflowInspector();