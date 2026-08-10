import { randomUUID } from "node:crypto";

import {
    InMemoryEventBusV2,
    InMemoryEventStore,
} from "../events";

import { FounderNotification } from "../executive/notifications";

import {
    ChannelIdentity,
    CommunicationChannel,
    CommunicationService,
    COMMUNICATION_MESSAGE_REQUESTED_EVENT,
    EventCommunicationBridge,
    InMemoryCommunicationService,
} from "./index";

export interface FounderCommunicationConfig {
    communicationService?: CommunicationService;
    channel?: CommunicationChannel;
    recipient?: ChannelIdentity;
}

export class FounderCommunication {
    private readonly communicationService: CommunicationService;

    private readonly eventBus = new InMemoryEventBusV2(
        new InMemoryEventStore(),
    );

    private readonly bridge: EventCommunicationBridge;

    private readonly conversationId = "founder-executive";

    private readonly channel: CommunicationChannel;

    private readonly recipient: ChannelIdentity;

    constructor(config: FounderCommunicationConfig = {}) {
        this.communicationService =
            config.communicationService ?? new InMemoryCommunicationService();

        this.channel = config.channel ?? "internal";

        this.recipient =
            config.recipient ?? {
                channel: this.channel,
                externalId: "founder",
                displayName: "Founder",
            };

        if (this.recipient.channel !== this.channel) {
            throw new Error(
                `Founder communication channel mismatch: ${this.channel} vs ${this.recipient.channel}`,
            );
        }

        this.bridge = new EventCommunicationBridge(
            this.eventBus,
            this.communicationService,
        );

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
                    channel: this.channel,
                    recipient: this.recipient,
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
