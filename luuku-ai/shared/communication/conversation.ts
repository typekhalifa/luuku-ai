import { ChannelIdentity, CommunicationChannel } from "./channel";
import { CommunicationMessage } from "./message";

export type ConversationStatus = "active" | "closed" | "waiting_approval";

export type CommunicationOwnership =
    | {
          scope: "COMPANY";
          companyId: string;
      }
    | {
          scope: "SPACE";
          spaceId: string;
      }
    | {
          scope: "SYSTEM";
      };

export interface CommunicationConversation {
    id: string;
    channel: CommunicationChannel;
    ownership: CommunicationOwnership;
    participants: ChannelIdentity[];
    messages: CommunicationMessage[];
    status: ConversationStatus;
    createdAt: string;
    updatedAt: string;
    metadata?: Record<string, unknown>;
}
