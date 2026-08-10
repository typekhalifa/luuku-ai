export interface DiscordEnvironment {
    botToken: string;
    channelId: string;
}

export function loadDiscordEnvironment(
    env: NodeJS.ProcessEnv = process.env,
): DiscordEnvironment {
    const botToken = env.DISCORD_BOT_TOKEN?.trim();
    const channelId = env.DISCORD_CHANNEL_ID?.trim();

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
