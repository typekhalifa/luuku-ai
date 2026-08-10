import { CommunicationService, ReceiveMessageInput, SendMessageInput } from "./communication-service";
import { CommunicationConversation } from "./conversation";
import { CommunicationMessage } from "./message";

export class InMemoryCommunicationService implements CommunicationService {
    private readonly conversations = new Map<string, CommunicationConversation>();

    async sendMessage(input: SendMessageInput): Promise<CommunicationMessage> {
        const conversation = this.getOrCreateConversation(
            input.conversationId,
            input.channel,
            input.recipient,
        );
        const now = new Date().toISOString();

        const message: CommunicationMessage = {
            id: this.createId("msg"),
            conversationId: conversation.id,
            direction: "outbound",
            role: "agent",
            content: input.content,
            sender: {
                channel: input.channel,
                displayName: "Luuku AI",
            },
            timestamp: now,
            metadata: input.metadata,
        };

        conversation.messages.push(message);
        conversation.updatedAt = now;
        this.conversations.set(conversation.id, conversation);

        return message;
    }

    async receiveMessage(input: ReceiveMessageInput): Promise<CommunicationMessage> {
        const conversationId = input.externalConversationId ?? this.createId("conv");
        const conversation = this.getOrCreateConversation(
            conversationId,
            input.channel,
            input.sender,
        );
        const now = new Date().toISOString();

        const message: CommunicationMessage = {
            id: this.createId("msg"),
            conversationId: conversation.id,
            direction: "inbound",
            role: input.sender.channel === "internal" ? "founder" : "system",
            content: input.content,
            sender: input.sender,
            timestamp: now,
            metadata: input.metadata,
        };

        conversation.messages.push(message);
        conversation.updatedAt = now;
        this.conversations.set(conversation.id, conversation);

        return message;
    }

    async getConversation(conversationId: string): Promise<CommunicationConversation | null> {
        return this.conversations.get(conversationId) ?? null;
    }

    private getOrCreateConversation(
        conversationId: string,
        channel: CommunicationConversation["channel"],
        participant: CommunicationConversation["participants"][number],
    ): CommunicationConversation {
        const existing = this.conversations.get(conversationId);

        if (existing) {
            return existing;
        }

        const now = new Date().toISOString();
        const conversation: CommunicationConversation = {
            id: conversationId,
            channel,
            participants: [participant],
            messages: [],
            status: "active",
            createdAt: now,
            updatedAt: now,
        };

        this.conversations.set(conversationId, conversation);
        return conversation;
    }

    private createId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
}
