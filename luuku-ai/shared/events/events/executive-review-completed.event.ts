import { Event } from "../core/event";

import { EventContext } from "../core/event-context";

export class ExecutiveReviewCompletedEvent
    extends Event {

    static readonly TYPE =
        "ExecutiveReviewCompleted";

    constructor(

        context: EventContext,

        public readonly companyId: string,

        public readonly companyName: string,

        public readonly priority:
            "low" | "normal" | "high",

        public readonly ownerAgent: string,

        public readonly nextAction: string,

        public readonly estimatedValue: number

    ) {

        super(

            ExecutiveReviewCompletedEvent.TYPE,

            context

        );

    }

}