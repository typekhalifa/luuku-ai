import {
    CommunicationService,
    ReceiveMessageInput,
    SendMessageInput,
    CommunicationContext,
} from "./communication-service";
import { CommunicationConversation } from "./conversation";
import { CommunicationMessage } from "./message";
import {
    ChannelAdapterRegistry,
    OutboundChannelMessage,
} from "./channel-adapter";

export class ChannelCommunicationService implements CommunicationService {
    constructor(
        private readonly store: CommunicationService,
        private readonly adapters: ChannelAdapterRegistry,
    ) {}

    async sendMessage(input: SendMessageInput): Promise<CommunicationMessage> {
        const adapter = this.adapters.get(input.channel);

        if (!adapter) {
            throw new Error(
                `No communication adapter registered for channel: ${input.channel}`,
            );
        }

        const outbound: OutboundChannelMessage = {
            conversationId: input.conversationId,
            recipient: input.recipient,
            content: input.content,
            metadata: input.metadata,
        };

        await adapter.send(outbound);

        return this.store.sendMessage({
            ...input,
            metadata: {
                ...input.metadata,
                deliveryStatus: "sent",
                deliveredAt: new Date().toISOString(),
            },
        });
    }

    async receiveMessage(input: ReceiveMessageInput): Promise<CommunicationMessage> {
        return this.store.receiveMessage(input);
    }

    async getConversation(
        conversationId: string,
        context: CommunicationContext,
    ): Promise<CommunicationConversation | null> {
        return this.store.getConversation(conversationId, context);
    }
}
