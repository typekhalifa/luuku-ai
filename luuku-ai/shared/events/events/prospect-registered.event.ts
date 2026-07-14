import { Event } from "../core/event";

import { EventContext } from "../core/event-context";

export class ProspectRegisteredEvent extends Event {

    static readonly TYPE =
        "ProspectRegistered";

    constructor(

        context: EventContext,

        public readonly companyId: string,

        public readonly companyName: string,

        public readonly contactId: string,

        public readonly dealId: string

    ) {

        super(

            ProspectRegisteredEvent.TYPE,

            context

        );

    }

}