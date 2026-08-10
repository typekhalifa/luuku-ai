import {
    CommunicationChannelAdapter,
    InboundChannelMessage,
    OutboundChannelMessage,
} from "./channel-adapter";

export interface DiscordAdapterConfig {
    botToken: string;
    defaultChannelId?: string;
    apiBaseUrl?: string;
}

export type DiscordFetch = (
    input: string,
    init?: RequestInit,
) => Promise<Response>;

interface DiscordMessageResponse {
    id?: string;
    channel_id?: string;
    content?: string;
}

export class DiscordChannelAdapter implements CommunicationChannelAdapter {
    readonly channel = "discord" as const;

    private readonly apiBaseUrl: string;
    private readonly fetchImpl: DiscordFetch;

    constructor(
        private readonly config: DiscordAdapterConfig,
        fetchImpl: DiscordFetch = fetch,
    ) {
        if (!config.botToken.trim()) {
            throw new Error("Discord adapter requires a bot token");
        }

        this.apiBaseUrl = (
            config.apiBaseUrl ?? "https://discord.com/api/v10"
        ).replace(/\/$/, "");
        this.fetchImpl = fetchImpl;
    }

    async send(message: OutboundChannelMessage): Promise<void> {
        const channelId = message.recipient.externalId ?? this.config.defaultChannelId;

        if (!channelId) {
            throw new Error(
                "Discord adapter requires recipient.externalId or defaultChannelId",
            );
        }

        const response = await this.fetchImpl(
            `${this.apiBaseUrl}/channels/${encodeURIComponent(channelId)}/messages`,
            {
                method: "POST",
                headers: {
                    Authorization: `Bot ${this.config.botToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    content: message.content,
                }),
            },
        );

        if (!response.ok) {
            const body = await response.text();
            throw new Error(
                `Discord API request failed (${response.status} ${response.statusText}): ${body}`,
            );
        }
    }

    async normalizeInbound(
        message: InboundChannelMessage,
    ): Promise<InboundChannelMessage> {
        if (message.channel !== this.channel) {
            throw new Error(
                `Discord adapter cannot normalize channel: ${message.channel}`,
            );
        }

        return message;
    }
}

export function parseDiscordMessageResponse(
    response: unknown,
): Pick<DiscordMessageResponse, "id" | "channel_id" | "content"> {
    if (!response || typeof response !== "object") {
        throw new Error("Invalid Discord message response");
    }

    const message = response as DiscordMessageResponse;
    return {
        id: message.id,
        channel_id: message.channel_id,
        content: message.content,
    };
}
