import { MessageEnvelope } from "../protocols";

export interface Mailbox {

    receive(

        envelope: MessageEnvelope

    ): Promise<void>;

    read(): Promise<MessageEnvelope[]>;

    clear(): Promise<void>;

}