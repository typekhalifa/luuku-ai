import {
    InMemoryCommunicationService,
} from "../in-memory-communication-service";

async function runDemo() {
    const service = new InMemoryCommunicationService();

    const inbound = await service.receiveMessage({
        channel: "internal",
        sender: {
            channel: "internal",
            externalId: "founder",
            displayName: "Founder",
        },
        content: "Give me today's company briefing.",
        externalConversationId: "founder-executive",
    });

    const outbound = await service.sendMessage({
        conversationId: inbound.conversationId,
        channel: "internal",
        recipient: {
            channel: "internal",
            externalId: "founder",
            displayName: "Founder",
        },
        content: "The briefing is ready for review.",
    });

    const conversation = await service.getConversation(
        inbound.conversationId,
    );

    if (!conversation) {
        throw new Error("Communication demo failed: conversation not found");
    }

    if (conversation.messages.length !== 2) {
        throw new Error(
            `Communication demo failed: expected 2 messages, got ${conversation.messages.length}`,
        );
    }

    console.log("");
    console.log("========================================");
    console.log("     COMMUNICATION DOMAIN DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Conversation : ${conversation.id}`);
    console.log(`Messages     : ${conversation.messages.length}`);
    console.log(`Inbound      : ${inbound.content}`);
    console.log(`Outbound     : ${outbound.content}`);
    console.log(`Status       : ${conversation.status}`);
    console.log("");
    console.log("Communication loop passed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Communication demo failed:", error);
    process.exitCode = 1;
});
