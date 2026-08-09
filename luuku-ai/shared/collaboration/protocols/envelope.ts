import { AgentMessage } from "../messages";

import { AgentAddress } from "./address";

export interface MessageEnvelope<T = unknown> {

    sender: AgentAddress;

    recipient: AgentAddress;

    message: AgentMessage<T>;

    deliveredAt?: string;

}