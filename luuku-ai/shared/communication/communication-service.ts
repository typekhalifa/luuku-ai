import { ChannelIdentity, CommunicationChannel } from "./channel";
import {
    CommunicationConversation,
    CommunicationOwnership,
} from "./conversation";
import { CommunicationMessage } from "./message";

export interface CommunicationContext {
    ownership: CommunicationOwnership;
}

export interface SendMessageInput {
    conversationId: string;
    channel: CommunicationChannel;
    recipient: ChannelIdentity;
    content: string;
    context: CommunicationContext;
    metadata?: Record<string, unknown>;
}

export interface ReceiveMessageInput {
    channel: CommunicationChannel;
    sender: ChannelIdentity;
    content: string;
    context: CommunicationContext;
    conversationId?: string | null;
    externalConversationId?: string;
    metadata?: Record<string, unknown>;
}

export interface CommunicationService {
    sendMessage(input: SendMessageInput): Promise<CommunicationMessage>;
    receiveMessage(input: ReceiveMessageInput): Promise<CommunicationMessage>;
    getConversation(
        conversationId: string,
        context: CommunicationContext,
    ): Promise<CommunicationConversation | null>;
}
