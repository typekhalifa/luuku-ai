import { ChannelIdentity, CommunicationChannel } from "./channel";

export const COMMUNICATION_MESSAGE_REQUESTED_EVENT =
    "communication.message.requested";

export interface CommunicationMessageRequestedPayload {
    conversationId: string;
    channel: CommunicationChannel;
    recipient: ChannelIdentity;
    content: string;
    metadata?: Record<string, unknown>;
}
