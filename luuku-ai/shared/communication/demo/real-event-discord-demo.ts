import "dotenv/config";

import {
    InMemoryEventBusV2,
    InMemoryEventStore,
} from "../../events";
import {
    ChannelCommunicationService,
    DiscordChannelAdapter,
    InMemoryChannelAdapterRegistry,
    EventCommunicationBridge,
    COMMUNICATION_MESSAGE_REQUESTED_EVENT,
    PrismaCommunicationService,
} from "..";
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

    const eventBus = new InMemoryEventBusV2(new InMemoryEventStore());
    const bridge = new EventCommunicationBridge(
        eventBus,
        communicationService,
    );

    bridge.register();

    const conversationId = "founder-executive";
    const content =
        "🧠 LEX: Event-driven communication is now live through the persistent Communication Core.";

    await eventBus.publish({
        id: `evt_real_discord_${Date.now()}`,
        type: COMMUNICATION_MESSAGE_REQUESTED_EVENT,
        category: "communication",
        source: "executive-ai",
        timestamp: new Date().toISOString(),
        payload: {
            conversationId,
            channel: "discord",
            recipient: {
                channel: "discord",
                externalId: discord.channelId,
                displayName: "Founder",
            },
            content,
            metadata: {
                priority: "high",
                delivery: "real-discord",
            },
        },
    });

    const conversation = await communicationService.getConversation(
        conversationId,
    );

    if (!conversation || conversation.messages.length < 1) {
        throw new Error(
            "Real event Discord demo failed: communication message was not persisted",
        );
    }

    console.log("");
    console.log("========================================");
    console.log("   REAL EVENT → DISCORD DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Event type   : ${COMMUNICATION_MESSAGE_REQUESTED_EVENT}`);
    console.log(`Source       : executive-ai`);
    console.log(`Channel      : discord`);
    console.log(`Conversation : ${conversation.id}`);
    console.log(`Messages     : ${conversation.messages.length}`);
    console.log(`Latest       : ${conversation.messages.at(-1)?.content}`);
    console.log("");
    console.log("Real event → persistent Communication Core → Discord delivery passed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Real event Discord demo failed:", error);
    process.exitCode = 1;
});
