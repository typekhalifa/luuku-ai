import { randomUUID } from "node:crypto";

import {
    InMemoryEventBusV2,
    InMemoryEventStore,
} from "../events";

import { FounderNotification } from "../executive/notifications";

import {
    COMMUNICATION_MESSAGE_REQUESTED_EVENT,
    EventCommunicationBridge,
    InMemoryCommunicationService,
} from "./index";

export class FounderCommunication {
    private readonly communicationService =
        new InMemoryCommunicationService();

    private readonly eventBus = new InMemoryEventBusV2(
        new InMemoryEventStore(),
    );

    private readonly bridge = new EventCommunicationBridge(
        this.eventBus,
        this.communicationService,
    );

    private readonly conversationId = "founder-executive";

    constructor() {
        this.bridge.register();
    }

    async publishNotifications(
        notifications: FounderNotification[],
    ): Promise<void> {
        for (const notification of notifications) {
            await this.eventBus.publish({
                id: randomUUID(),
                type: COMMUNICATION_MESSAGE_REQUESTED_EVENT,
                category: "communication",
                source: "executive-ai",
                timestamp: new Date().toISOString(),
                payload: {
                    conversationId: this.conversationId,
                    channel: "internal",
                    recipient: {
                        channel: "internal",
                        externalId: "founder",
                        displayName: "Founder",
                    },
                    content: `${notification.title}: ${notification.message}`,
                    metadata: {
                        level: notification.level,
                    },
                },
            });
        }
    }

    async getFounderConversation() {
        return this.communicationService.getConversation(
            this.conversationId,
        );
    }
}
