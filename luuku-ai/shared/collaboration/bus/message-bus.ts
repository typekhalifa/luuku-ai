import {

    Mailbox

} from "../mailboxes";

import {

    MessageEnvelope

} from "../protocols";

export interface MessageBus {

    register(

        agentId: string,

        mailbox: Mailbox

    ): void;

    send(

        envelope: MessageEnvelope

    ): Promise<void>;

}