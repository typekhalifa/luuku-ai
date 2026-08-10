import {
    InMemoryChannelAdapter,
    InMemoryChannelAdapterRegistry,
} from "../in-memory-channel-adapter";

async function runDemo() {
    const registry = new InMemoryChannelAdapterRegistry();
    const adapter = new InMemoryChannelAdapter();

    registry.register(adapter);

    const resolved = registry.get("internal");

    if (!resolved) {
        throw new Error("Channel adapter demo failed: adapter was not resolved");
    }

    await resolved.send({
        conversationId: "founder-executive",
        recipient: {
            channel: "internal",
            externalId: "founder",
            displayName: "Founder",
        },
        content: "Your Luuku AI briefing is ready.",
        metadata: {
            source: "executive-ai",
        },
    });

    const missing = registry.get("discord");

    if (missing !== null) {
        throw new Error(
            "Channel adapter demo failed: unregistered channel resolved unexpectedly",
        );
    }

    if (adapter.sent.length !== 1) {
        throw new Error(
            `Channel adapter demo failed: expected 1 sent message, got ${adapter.sent.length}`,
        );
    }

    const [message] = adapter.sent;

    console.log("");
    console.log("========================================");
    console.log("       CHANNEL ADAPTER DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Registered    : ${adapter.channel}`);
    console.log(`Resolved      : ${resolved.channel}`);
    console.log(`Conversation  : ${message.conversationId}`);
    console.log(`Delivered     : ${message.content}`);
    console.log(`Sent messages : ${adapter.sent.length}`);
    console.log(`Discord       : ${missing === null ? "not registered (expected)" : "unexpected"}`);
    console.log("");
    console.log("Channel adapter registry passed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Channel adapter demo failed:", error);
    process.exitCode = 1;
});
