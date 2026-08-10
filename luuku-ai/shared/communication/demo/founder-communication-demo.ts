import {
    FounderCommunication,
} from "../founder-communication";

async function runDemo() {
    const communication = new FounderCommunication();

    await communication.publishNotifications([
        {
            level: "warning",
            title: "High Priority Executive Decision",
            message: "Research Agent identified a high-value prospect requiring review.",
        },
        {
            level: "info",
            title: "Daily Briefing Ready",
            message: "The company briefing is ready for the founder.",
        },
    ]);

    const conversation = await communication.getFounderConversation();

    if (!conversation) {
        throw new Error("Founder communication demo failed: conversation not found");
    }

    if (conversation.messages.length !== 2) {
        throw new Error(
            `Founder communication demo failed: expected 2 messages, got ${conversation.messages.length}`,
        );
    }

    console.log("");
    console.log("========================================");
    console.log("      FOUNDER COMMUNICATION DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Conversation : ${conversation.id}`);
    console.log(`Messages     : ${conversation.messages.length}`);

    for (const message of conversation.messages) {
        console.log("");
        console.log(`[${String(message.metadata?.level ?? "info").toUpperCase()}]`);
        console.log(message.content);
    }

    console.log("");
    console.log("Executive notifications reached the communication layer.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Founder communication demo failed:", error);
    process.exitCode = 1;
});
