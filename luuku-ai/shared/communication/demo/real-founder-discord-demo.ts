import "dotenv/config";

import {
    ChannelCommunicationService,
    DiscordChannelAdapter,
    FounderCommunication,
    InMemoryChannelAdapterRegistry,
} from "..";
import { PrismaCommunicationService } from "../prisma-communication-service";
import { loadDiscordEnvironment } from "../discord-config";

async function runDemo() {
    const discord = loadDiscordEnvironment();

    const adapterRegistry = new InMemoryChannelAdapterRegistry();
    adapterRegistry.register(
        new DiscordChannelAdapter({
            botToken: discord.botToken,
            defaultChannelId: discord.channelId,
        }),
    );

    const communicationStore = new PrismaCommunicationService();
    const communicationService = new ChannelCommunicationService(
        communicationStore,
        adapterRegistry,
    );

    const founderCommunication = new FounderCommunication({
        communicationService,
        channel: "discord",
        recipient: {
            channel: "discord",
            externalId: discord.channelId,
            displayName: "Founder",
        },
    });

    await founderCommunication.publishNotifications([
        {
            level: "info",
            title: "Executive Communication Online",
            message:
                "LEX is now connected to the founder notification pipeline. Executive notifications can reach Discord through the persistent Communication Core.",
        },
    ]);

    const conversation = await founderCommunication.getFounderConversation();

    if (!conversation || conversation.messages.length < 1) {
        throw new Error(
            "Real founder Discord demo failed: notification was not persisted",
        );
    }

    console.log("");
    console.log("========================================");
    console.log(" FOUNDER COMMUNICATION → REAL DISCORD");
    console.log("========================================");
    console.log("");
    console.log(`Channel      : discord`);
    console.log(`Conversation : ${conversation.id}`);
    console.log(`Messages     : ${conversation.messages.length}`);
    console.log(`Latest       : ${conversation.messages.at(-1)?.content}`);
    console.log("");
    console.log("Founder notification → persistent Communication Core → Discord passed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Real founder Discord demo failed:", error);
    process.exitCode = 1;
});
