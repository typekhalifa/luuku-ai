import { randomUUID } from "node:crypto";

import { DiscordGatewayListener } from "../discord-gateway-listener";
import { DiscordInboundCommunicationBridge } from "../discord-inbound-bridge";
import { loadDiscordEnvironment } from "../discord-config";
import { prismaCommunicationService } from "../prisma-communication-service";
import { CommunicationSpace } from "../department-space";

async function runDemo() {
    const discord = loadDiscordEnvironment();

    const space: CommunicationSpace = {
        id: "founder-discord",
        name: "Founder Discord",
        department: "executive",
        kind: "system",
        members: ["lex"],
        bindings: [
            {
                channel: "discord",
                externalId: discord.channelId,
                name: "Founder Discord",
            },
        ],
    };

    const bridge = new DiscordInboundCommunicationBridge(
        prismaCommunicationService,
        [space],
    );

    const listener = new DiscordGatewayListener({
        botToken: discord.botToken,
        channelId: discord.channelId,
        onMessage: async (message) => {
            const result = await bridge.handleMessage(message);

            if (!result.accepted || !result.message) {
                console.log(`Ignored Discord message: ${result.reason}`);
                return;
            }

            console.log("");
            console.log("========================================");
            console.log("   DISCORD LIVE INBOUND DEMO");
            console.log("========================================");
            console.log("");
            console.log(`Discord message : ${message.id}`);
            console.log(`Author          : ${message.authorName}`);
            console.log(`Channel         : ${message.channelId}`);
            console.log(`Space           : ${result.spaceId}`);
            console.log(`Conversation    : ${result.message.conversationId}`);
            console.log(`Content         : ${result.message.content}`);
            console.log("");
            console.log("Discord live inbound bridge passed.");
            console.log("");

            listener.stop();
        },
    });

    const marker = randomUUID();
    console.log(`Discord live gateway demo started (${marker}).`);
    console.log("Send one founder message in the configured Discord channel.");

    await listener.start();
}

runDemo().catch((error) => {
    console.error("Discord live gateway demo failed:", error);
    process.exitCode = 1;
});
