import { Mailbox } from "./mailbox";

import { MessageEnvelope } from "../protocols";

export class InMemoryMailbox implements Mailbox {

    private readonly messages: MessageEnvelope[] = [];

    async receive(

        envelope: MessageEnvelope

    ): Promise<void> {

        this.messages.push(envelope);

    }

    async read(): Promise<MessageEnvelope[]> {

        return [...this.messages];

    }

    async clear(): Promise<void> {

        this.messages.length = 0;

    }

}