import { InMemoryCommunicationService } from "../in-memory-communication-service";
import { CommunicationSpace } from "../department-space";
import {
    discordBinding,
} from "../discord-space-binding";
import {
    DiscordInboundCommunicationBridge,
} from "../discord-inbound-bridge";

async function main(): Promise<void> {
    console.log("");
    console.log("========================================");
    console.log("    DISCORD INBOUND CORE BRIDGE TEST");
    console.log("========================================");
    console.log("");

    const researchSpace: CommunicationSpace = {
        id: "research",
        name: "Research",
        department: "research",
        kind: "department",
        members: ["research-agent"],
        bindings: [discordBinding("discord-research-001", "#research")],
    };

    const communicationService = new InMemoryCommunicationService();
    const bridge = new DiscordInboundCommunicationBridge(
        communicationService,
        [researchSpace],
    );

    const accepted = await bridge.handleMessage({
        id: "discord-message-001",
        channelId: "discord-research-001",
        authorId: "founder-001",
        authorName: "Founder",
        content: "Research, analyze the top AI automation opportunities.",
        timestamp: "2026-08-17T19:00:00.000Z",
    });

    const rejected = await bridge.handleMessage({
        id: "discord-message-002",
        channelId: "discord-unknown-999",
        authorId: "founder-001",
        authorName: "Founder",
        content: "This channel is not registered.",
        timestamp: "2026-08-17T19:01:00.000Z",
    });

    const conversation = accepted.message
        ? await communicationService.getConversation(accepted.message.conversationId)
        : null;

    const storedMessage = conversation?.messages[0];

    console.log(`Accepted space         : ${accepted.spaceId ?? "none"}`);
    console.log(`Stored channel         : ${storedMessage?.sender.channel ?? "none"}`);
    console.log(`Stored content         : ${storedMessage?.content ?? "none"}`);
    console.log(`Stored space metadata  : ${String(storedMessage?.metadata?.spaceId ?? "none")}`);
    console.log(`Unknown channel result : ${rejected.reason}`);
    console.log("");

    if (
        !accepted.accepted ||
        accepted.spaceId !== "research" ||
        !accepted.message ||
        accepted.message.direction !== "inbound" ||
        storedMessage?.sender.channel !== "discord" ||
        storedMessage.metadata?.spaceId !== "research" ||
        rejected.accepted ||
        rejected.reason !== "space-not-found"
    ) {
        throw new Error("Discord inbound bridge regression failed.");
    }

    console.log(
        "GREEN: Discord inbound messages enter Communication Core with space context.",
    );
}

void main();
