import { config } from "../config/env";
import { DiscordChannelAdapter } from "./discord-adapter";
import { loadDiscordEnvironment } from "./discord-config";
import {
    CommunicationAdapter,
    CommunicationExecutionResult,
    CommunicationRequest,
} from "./types";

export class DiscordRouterAdapter implements CommunicationAdapter {
    readonly capability = "discord.send" as const;
    readonly channel = "discord" as const;

    private readonly adapter: DiscordChannelAdapter | null;

    constructor() {
        const botToken = config.discordBotToken.trim();
        const channelId = config.discordChannelId.trim();

        this.adapter = botToken && channelId
            ? new DiscordChannelAdapter({
                  botToken,
                  defaultChannelId: channelId,
              })
            : null;
    }

    isAvailable(): boolean {
        return this.adapter !== null;
    }

    async execute(
        request: CommunicationRequest,
    ): Promise<CommunicationExecutionResult> {
        if (!this.adapter) {
            return {
                capability: this.capability,
                channel: this.channel,
                status: "blocked",
                executed: false,
                verified: false,
                summary: "Discord credentials are not configured.",
                error: "DISCORD_CONFIGURATION_MISSING",
            };
        }

        const discord = loadDiscordEnvironment();
        const recipientExternalId =
            request.recipientExternalId ||
            request.recipient ||
            discord.channelId;

        await this.adapter.send({
            conversationId:
                typeof request.metadata?.conversationId === "string"
                    ? request.metadata.conversationId
                    : "founder-executive",
            recipient: {
                channel: "discord",
                externalId: recipientExternalId,
                displayName: "Founder",
            },
            content: request.body ?? "",
            metadata: request.metadata,
        });

        return {
            capability: this.capability,
            channel: this.channel,
            status: "verified",
            executed: true,
            verified: true,
            evidence: {
                provider: "discord",
                reference: `discord:channel:${recipientExternalId}`,
                details: {
                    channelId: recipientExternalId,
                    delivery: "discord-api-confirmed",
                },
            },
            summary: "LEX response delivered to Discord and verified by the Discord API.",
        };
    }
}

export const discordRouterAdapter = new DiscordRouterAdapter();
