export type CommunicationChannel =
    | "internal"
    | "whatsapp"
    | "discord"
    | "slack"
    | "telegram"
    | "voice";

export type MessageDirection = "inbound" | "outbound";

export type MessageRole = "founder" | "agent" | "system";

export interface ChannelIdentity {
    channel: CommunicationChannel;
    externalId?: string;
    displayName?: string;
}
