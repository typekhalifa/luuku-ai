import { ChannelIdentity } from "./channel";
import { CommunicationService } from "./communication-service";
import { CommunicationMessage } from "./message";
import { CommunicationSpace } from "./department-space";
import { resolveDiscordSpaceBinding } from "./discord-space-binding";

export interface DiscordInboundCommunicationMessage {
    id: string;
    channelId: string;
    authorId: string;
    authorName: string;
    content: string;
    timestamp: string;
}

export interface DiscordInboundBridgeResult {
    accepted: boolean;
    reason: "space-not-found" | "received";
    spaceId?: string;
    message?: CommunicationMessage;
}

export class DiscordInboundCommunicationBridge {
    constructor(
        private readonly communicationService: CommunicationService,
        private readonly spaces: CommunicationSpace[],
    ) {}

    async handleMessage(
        input: DiscordInboundCommunicationMessage,
    ): Promise<DiscordInboundBridgeResult> {
        const space = this.spaces.find((candidate) => {
            const binding = resolveDiscordSpaceBinding(candidate);
            return binding?.channelId === input.channelId;
        });

        if (!space) {
            return {
                accepted: false,
                reason: "space-not-found",
            };
        }

        const sender: ChannelIdentity = {
            channel: "discord",
            externalId: input.authorId,
            displayName: input.authorName,
        };

        const message = await this.communicationService.receiveMessage({
            channel: "discord",
            sender,
            content: input.content,
            externalConversationId: `discord:${input.channelId}`,
            metadata: {
                source: "discord",
                spaceId: space.id,
                spaceName: space.name,
                discordChannelId: input.channelId,
                discordMessageId: input.id,
                receivedAt: input.timestamp,
            },
        });

        return {
            accepted: true,
            reason: "received",
            spaceId: space.id,
            message,
        };
    }
}
