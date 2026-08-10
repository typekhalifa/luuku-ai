import { CommunicationChannel, ChannelIdentity } from "./channel";
import { CommunicationMessage } from "./message";

export interface OutboundChannelMessage {
    conversationId: string;
    recipient: ChannelIdentity;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface InboundChannelMessage {
    channel: CommunicationChannel;
    sender: ChannelIdentity;
    content: string;
    externalConversationId?: string;
    metadata?: Record<string, unknown>;
}

export interface CommunicationChannelAdapter {
    readonly channel: CommunicationChannel;

    send(message: OutboundChannelMessage): Promise<void>;

    normalizeInbound(message: InboundChannelMessage): Promise<InboundChannelMessage>;
}

export interface ChannelAdapterRegistry {
    register(adapter: CommunicationChannelAdapter): void;
    get(channel: CommunicationChannel): CommunicationChannelAdapter | null;
}
