import { EventBus, EventHandler } from "../events";
import { CommunicationMessageRequestedPayload, COMMUNICATION_MESSAGE_REQUESTED_EVENT } from "./events";
import { CommunicationService } from "./communication-service";

export class EventCommunicationBridge {
    constructor(
        private readonly eventBus: EventBus,
        private readonly communicationService: CommunicationService,
    ) {}

    register(): void {
        this.eventBus.subscribe(
            COMMUNICATION_MESSAGE_REQUESTED_EVENT,
            this.handleMessageRequested,
        );
    }

    private readonly handleMessageRequested: EventHandler = async (event) => {
        const payload = event.payload as CommunicationMessageRequestedPayload;

        await this.communicationService.sendMessage({
            conversationId: payload.conversationId,
            channel: payload.channel,
            recipient: payload.recipient,
            content: payload.content,
            metadata: {
                ...payload.metadata,
                eventId: event.id,
                eventType: event.type,
            },
        });
    };
}
