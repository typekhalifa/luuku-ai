import {
    authorizeDiscordFounder,
    handleAuthorizedDiscordMessage,
    parseDiscordFounderAllowlist,
} from "../discord-founder-authorization";
import { InMemoryCommunicationService } from "../in-memory-communication-service";
import { CommunicationSpace } from "../department-space";
import { discordBinding } from "../discord-space-binding";
import { DiscordInboundCommunicationBridge } from "../discord-inbound-bridge";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
    const unconfigured = authorizeDiscordFounder("12345", parseDiscordFounderAllowlist(undefined));
    assert(!unconfigured.allowed && unconfigured.reason === "founder-allowlist-not-configured",
        "Founder authorization must fail closed when the allowlist is missing.");

    const allowlist = parseDiscordFounderAllowlist(" 12345, 67890, ,12345 ");
    assert(allowlist.size === 2, "Allowlist parsing must trim IDs, discard blanks, and deduplicate.");

    const founder = authorizeDiscordFounder("12345", allowlist);
    assert(founder.allowed, "An allowlisted immutable Discord user ID should be authorized.");

    const attacker = authorizeDiscordFounder("99999", allowlist);
    assert(!attacker.allowed && attacker.reason === "discord-user-not-allowlisted",
        "A non-allowlisted user must be rejected.");

    const missingId = authorizeDiscordFounder("  ", allowlist);
    assert(!missingId.allowed && missingId.reason === "discord-user-id-missing",
        "A missing user ID must be rejected.");

    const space: CommunicationSpace = {
        id: "founder-discord",
        name: "Founder Discord",
        department: "executive",
        kind: "system",
        members: ["lex"],
        bindings: [discordBinding("channel-123", "Founder")],
    };
    const communicationService = new InMemoryCommunicationService();
    const bridge = new DiscordInboundCommunicationBridge(communicationService, [space]);

    // Authorization must precede persistence/forwarding into the communication bridge.
    const unauthorizedMessage = {
        id: "message-unauthorized",
        channelId: "channel-123",
        authorId: "99999",
        authorName: "Founder",
        content: "Please execute an operational action.",
        timestamp: "2026-10-27T10:00:00.000Z",
    };
    let unauthorizedForwardCount = 0;
    const unauthorizedForwarded = await handleAuthorizedDiscordMessage(
        unauthorizedMessage,
        allowlist,
        async (message) => {
            unauthorizedForwardCount += 1;
            await bridge.handleMessage(message);
        },
    );
    assert(!unauthorizedForwarded, "Unauthorized message must not be forwarded.");
    assert(unauthorizedForwardCount === 0, "Unauthorized messages must not invoke the real ingress callback.");

    // Confirm the rejected message never reached the in-memory communication service.
    const unauthorizedConversation = await communicationService.getConversation(
        `discord:${unauthorizedMessage.channelId}`,
        { ownership: { scope: "SPACE", spaceId: "founder-discord" } },
    );
    assert(!unauthorizedConversation, "Unauthorized message must not create or persist a conversation.");

    let acceptedMessage: Awaited<ReturnType<typeof bridge.handleMessage>> | undefined;
    const authorizedForwarded = await handleAuthorizedDiscordMessage(
        {
            ...unauthorizedMessage,
            id: "message-founder",
            authorId: "12345",
            authorName: "Display names are not the identity proof",
            content: "Give me a read-only status update.",
        },
        allowlist,
        async (message) => {
            acceptedMessage = await bridge.handleMessage(message);
        },
    );
    const accepted = acceptedMessage;
    assert(authorizedForwarded && accepted?.accepted && accepted.message, "Allowlisted founder message should enter the communication bridge.");
    assert(accepted.message.sender.externalId === "12345", "Bridge must preserve immutable sender ID.");

    const conversation = await communicationService.getConversation(
        accepted.message.conversationId,
        { ownership: { scope: "SPACE", spaceId: "founder-discord" } },
    );
    assert(conversation?.messages.length === 1, "Only the authorized message should be persisted.");
    assert(conversation.messages[0].id === accepted.message.id, "Persisted message must match the authorized inbound message.");

    const wrongChannel = await bridge.handleMessage({
        ...unauthorizedMessage,
        id: "message-wrong-channel",
        authorId: "12345",
        channelId: "unregistered-channel",
    });
    assert(!wrongChannel.accepted && wrongChannel.reason === "space-not-found",
        "Unregistered channels must be rejected by the bridge.");

    console.log("Discord founder authorization: missing allowlist fails closed: PASS");
    console.log("Discord founder authorization: immutable allowlisted user ID accepted: PASS");
    console.log("Discord founder authorization: non-allowlisted ID rejected: PASS");
    console.log("Discord founder authorization: missing ID rejected: PASS");
    console.log("Discord ingress: unauthorized message is not forwarded: PASS");
    console.log("Discord ingress: authorized sender ID preserved in bridge: PASS");
    console.log("Discord ingress: unregistered channel rejected: PASS");
    console.log("Discord → Lex authorization contract: PASS");
}

void main().catch((error: unknown) => {
    console.error("Discord → Lex authorization contract: FAIL", error);
    process.exitCode = 1;
});
