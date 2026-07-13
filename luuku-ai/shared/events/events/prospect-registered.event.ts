import { Event } from "../core/event";

export class ProspectRegisteredEvent extends Event {

    static readonly TYPE = "ProspectRegistered";

    constructor(

        public readonly workflowId: string,

        public readonly companyId: string,

        public readonly companyName: string,

        public readonly contactId: string,

        public readonly dealId: string

    ) {

        super(
            ProspectRegisteredEvent.TYPE
        );

    }

}