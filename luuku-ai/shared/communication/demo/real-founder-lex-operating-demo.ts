import { randomUUID } from "node:crypto";

import { bootstrap } from "../../kernel/bootstrap";
import { DiscordGatewayListener } from "../discord-gateway-listener";
import { DiscordInboundCommunicationBridge } from "../discord-inbound-bridge";
import { loadDiscordEnvironment } from "../discord-config";
import { prismaCommunicationService } from "../prisma-communication-service";
import { registerCommunicationProviders } from "../providers";
import { founderLexOperatingResponder } from "../founder-lex-operating-responder";
import { CommunicationSpace } from "../department-space";

// Integration demo. Default is test mode. Sandbox and the deliberately
// restricted live controlled-email mode require explicit opt-in.
const requestedMode =
    process.env.LUUKU_EMAIL_DEMO_MODE;

const demoMode =
    requestedMode === "sandbox"
        ? "sandbox"
        : requestedMode === "live"
            ? "live"
            : "test";

process.env.EMAIL_MODE = demoMode;

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

    let messageCount = 0;

    const listener = new DiscordGatewayListener({
        botToken: discord.botToken,
        channelId: discord.channelId,
        onMessage: async (message) => {
            messageCount += 1;

            try {
                const result = await bridge.handleMessage(message);

                if (!result.accepted || !result.message) {
                    console.warn(
                        `Founder message was not accepted: ${result.reason}`,
                    );
                    return;
                }

                const response = await founderLexOperatingResponder.respond(
                    result.message,
                );

                console.log("");
                console.log("========================================");
                console.log(`   FOUNDER → LEX → COMPANY TURN #${messageCount}`);
                console.log("========================================");
                console.log("");
                console.log(`Inbound message : ${message.id}`);
                console.log(`Conversation    : ${response.conversationId}`);
                console.log(`Execution       : ${response.executionStatus}`);
                console.log(`Executed        : ${response.executed}`);
                console.log(`Verified        : ${response.verified}`);
                console.log(`LEX response    : ${response.response}`);
                console.log("");
                console.log(
                    "✓ Turn completed. LEX remains online and ready for the next founder message.",
                );
            } catch (error) {
                console.error("Founder → LEX company turn failed:", error);
                console.log("LEX remains online. You can send another message.");
            }
        },
    });

    console.log(`Founder LEX operating session started (${randomUUID()}).`);

    if (demoMode === "sandbox") {
        console.log(
            "EMAIL_MODE set to SANDBOX. Email execution is real inside the local sandbox, but no external network request can be made.",
        );
    } else if (demoMode === "live") {
        console.log(
            "EMAIL_MODE set to LIVE CONTROLLED TEST. Real network email is restricted to the configured controlled test recipient and requires explicit confirmation.",
        );
    } else {
        console.log(
            "EMAIL_MODE set to TEST for this demo. No external email can be sent.",
        );
    }

    console.log("Send messages in the configured Discord channel.");
    console.log("Ask for a recommendation, then explicitly approve it with 'Do it'.");
    console.log("Press Ctrl+C to stop the session.");
    console.log("");

    await listener.start();
}

runDemo().catch((error) => {
    console.error("Founder LEX operating session failed:", error);
    process.exitCode = 1;
});
