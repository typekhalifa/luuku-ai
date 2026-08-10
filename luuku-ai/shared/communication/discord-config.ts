import { config } from "../config/env";

export interface DiscordEnvironment {
    botToken: string;
    channelId: string;
}

export function loadDiscordEnvironment(): DiscordEnvironment {
    const botToken = config.discordBotToken.trim();
    const channelId = config.discordChannelId.trim();

    const missing: string[] = [];

    if (!botToken) {
        missing.push("DISCORD_BOT_TOKEN");
    }

    if (!channelId) {
        missing.push("DISCORD_CHANNEL_ID");
    }

    if (missing.length > 0) {
        throw new Error(
            `Discord environment is incomplete. Missing: ${missing.join(", ")}`,
        );
    }

    return {
        botToken,
        channelId,
    };
}
