import {
    CommunicationService,
    ReceiveMessageInput,
    SendMessageInput,
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
        const message = await this.store.sendMessage(input);
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
        return message;
    }

    async receiveMessage(input: ReceiveMessageInput): Promise<CommunicationMessage> {
        return this.store.receiveMessage(input);
    }

    async getConversation(
        conversationId: string,
    ): Promise<CommunicationConversation | null> {
        return this.store.getConversation(conversationId);
    }
}
