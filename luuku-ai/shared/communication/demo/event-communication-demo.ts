import {
    InMemoryEventBusV2,
    InMemoryEventStore,
} from "../../events";
import {
    EventCommunicationBridge,
    InMemoryCommunicationService,
    COMMUNICATION_MESSAGE_REQUESTED_EVENT,
} from "..";

async function runDemo() {
    const communicationService = new InMemoryCommunicationService();
    const eventStore = new InMemoryEventStore();
    const eventBus = new InMemoryEventBusV2(eventStore);

    const bridge = new EventCommunicationBridge(
        eventBus,
        communicationService,
    );

    bridge.register();

    const conversationId = "founder-executive";

    await eventBus.publish({
        id: "evt_communication_demo",
        type: COMMUNICATION_MESSAGE_REQUESTED_EVENT,
        category: "communication",
        source: "executive-ai",
        timestamp: new Date().toISOString(),
        payload: {
            conversationId,
            channel: "internal",
            recipient: {
                channel: "internal",
                externalId: "founder",
                displayName: "Founder",
            },
            content: "Your company briefing is ready.",
            metadata: {
                priority: "high",
            },
        },
    });

    const conversation = await communicationService.getConversation(
        conversationId,
    );

    if (!conversation) {
        throw new Error("Event communication demo failed: conversation not found");
    }

    if (conversation.messages.length !== 1) {
        throw new Error(
            `Event communication demo failed: expected 1 message, got ${conversation.messages.length}`,
        );
    }

    const [message] = conversation.messages;

    if (message.content !== "Your company briefing is ready.") {
        throw new Error("Event communication demo failed: message content mismatch");
    }

    console.log("");
    console.log("========================================");
    console.log("   EVENT → COMMUNICATION DOMAIN DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Event type   : ${COMMUNICATION_MESSAGE_REQUESTED_EVENT}`);
    console.log(`Conversation  : ${conversation.id}`);
    console.log(`Messages      : ${conversation.messages.length}`);
    console.log(`Message       : ${message.content}`);
    console.log(`Direction     : ${message.direction}`);
    console.log(`Source        : executive-ai`);
    console.log("");
    console.log("Event communication bridge passed.");
    console.log("");
}

runDemo().catch((error) => {
    console.error("Event communication demo failed:", error);
    process.exitCode = 1;
});
