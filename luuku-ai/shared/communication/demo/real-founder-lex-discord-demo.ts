import { randomUUID } from "node:crypto";

import { bootstrap } from "../../kernel/bootstrap";
import { DiscordGatewayListener } from "../discord-gateway-listener";
import { DiscordInboundCommunicationBridge } from "../discord-inbound-bridge";
import { loadDiscordEnvironment } from "../discord-config";
import { prismaCommunicationService } from "../prisma-communication-service";
import { registerCommunicationProviders } from "../providers";
import { founderLexResponder } from "../founder-lex-responder";
import { CommunicationSpace } from "../department-space";

async function runDemo() {
    await bootstrap();
    registerCommunicationProviders();

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

    let handled = false;

    const listener = new DiscordGatewayListener({
        botToken: discord.botToken,
        channelId: discord.channelId,
        onMessage: async (message) => {
            if (handled) return;
            handled = true;

            const result = await bridge.handleMessage(message);

            if (!result.accepted || !result.message) {
                throw new Error(`Founder message was not accepted: ${result.reason}`);
            }

            const response = await founderLexResponder.respond(result.message);

            console.log("");
            console.log("========================================");
            console.log("   FOUNDER → LEX → DISCORD LIVE LOOP");
            console.log("========================================");
            console.log("");
            console.log(`Inbound message : ${message.id}`);
            console.log(`Author          : ${message.authorName}`);
            console.log(`Conversation    : ${response.conversationId}`);
            console.log(`Execution       : ${response.executionStatus}`);
            console.log(`Executed        : ${response.executed}`);
            console.log(`Verified        : ${response.verified}`);
            console.log(`LEX response    : ${response.response}`);
            console.log("");
            console.log("Founder → LEX → Router → Discord loop passed.");
            console.log("");

            listener.stop();
        },
    });

    console.log(`Founder LEX Discord loop started (${randomUUID()}).`);
    console.log("Send one founder message in the configured Discord channel.");

    await listener.start();
}

runDemo().catch((error) => {
    console.error("Founder LEX Discord loop failed:", error);
    process.exitCode = 1;
});
