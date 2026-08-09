import {

    MessageBus

} from "./message-bus";

import {

    Mailbox

} from "../mailboxes";

import {

    MessageEnvelope

} from "../protocols";

export class InMemoryMessageBus

    implements MessageBus {

    private readonly mailboxes =

        new Map<string, Mailbox>();

    register(

        agentId: string,

        mailbox: Mailbox

    ): void {

        this.mailboxes.set(

            agentId,

            mailbox

        );

    }

    async send(

        envelope: MessageEnvelope

    ): Promise<void> {

        const mailbox =

            this.mailboxes.get(

                envelope.recipient.id

            );

        if (!mailbox) {

            throw new Error(

                `Mailbox not found for agent "${envelope.recipient.id}".`

            );

        }

        await mailbox.receive(

            envelope

        );

    }

}