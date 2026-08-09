import { ChannelIdentity, CommunicationChannel } from "./channel";
import { CommunicationConversation } from "./conversation";
import { CommunicationMessage } from "./message";

export interface SendMessageInput {
    conversationId: string;
    channel: CommunicationChannel;
    recipient: ChannelIdentity;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface ReceiveMessageInput {
    channel: CommunicationChannel;
    sender: ChannelIdentity;
    content: string;
    externalConversationId?: string;
    metadata?: Record<string, unknown>;
}

export interface CommunicationService {
    sendMessage(input: SendMessageInput): Promise<CommunicationMessage>;
    receiveMessage(input: ReceiveMessageInput): Promise<CommunicationMessage>;
    getConversation(conversationId: string): Promise<CommunicationConversation | null>;
}
