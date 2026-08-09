import { ChannelIdentity, CommunicationChannel } from "./channel";
import { CommunicationMessage } from "./message";

export type ConversationStatus = "active" | "closed" | "waiting_approval";

export interface CommunicationConversation {
    id: string;
    channel: CommunicationChannel;
    participants: ChannelIdentity[];
    messages: CommunicationMessage[];
    status: ConversationStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}
