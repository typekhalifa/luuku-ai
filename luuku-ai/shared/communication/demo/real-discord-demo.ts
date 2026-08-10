import "dotenv/config";
import { DiscordChannelAdapter } from "../discord-adapter";
import { loadDiscordEnvironment } from "../discord-config";

async function runDemo() {
    const discord = loadDiscordEnvironment();

    const adapter = new DiscordChannelAdapter({
        botToken: discord.botToken,
        defaultChannelId: discord.channelId,
    });

    await adapter.send({
        conversationId: "founder-executive",
        recipient: {
            channel: "discord",
            externalId: discord.channelId,
            displayName: "Founder",
        },
        content: "🤖 Luuku AI connection test successful.",
    });

    console.log("Discord real delivery passed.");
}

runDemo().catch((error) => {
    console.error("Discord real delivery failed:", error);
    process.exitCode = 1;
});
