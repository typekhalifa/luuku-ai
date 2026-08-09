import { ChannelIdentity, MessageDirection, MessageRole } from "./channel";

export interface CommunicationMessage {
    id: string;
    conversationId: string;
    direction: MessageDirection;
    role: MessageRole;
    content: string;
    sender: ChannelIdentity;
    timestamp: string;
    metadata?: Record<string, unknown>;
}
