import { ChannelIdentity, CommunicationChannel } from "./channel";
import { CommunicationContext } from "./communication-service";

export const COMMUNICATION_MESSAGE_REQUESTED_EVENT =
    "communication.message.requested";

export interface CommunicationMessageRequestedPayload {
    conversationId: string;
    channel: CommunicationChannel;
    recipient: ChannelIdentity;
    content: string;
    context: CommunicationContext;
    metadata?: Record<string, unknown>;
}
