import { CommunicationService, ReceiveMessageInput, SendMessageInput } from "./communication-service";
import { CommunicationConversation } from "./conversation";
import { CommunicationMessage } from "./message";
import { assertValidOwnership } from "./ownership";

export class InMemoryCommunicationService implements CommunicationService {
    private readonly conversations = new Map<string, CommunicationConversation>();

    async sendMessage(input: SendMessageInput): Promise<CommunicationMessage> {
        assertValidOwnership(input.context.ownership);
        const conversation = this.getOrCreateConversation(
            input.conversationId,
            input.channel,
            input.recipient,
            input.context,
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
        assertValidOwnership(input.context.ownership);
        const conversationId = input.externalConversationId ?? this.createId("conv");
        const conversation = this.getOrCreateConversation(
            conversationId,
            input.channel,
            input.sender,
            input.context,
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

    async getConversation(
        conversationId: string,
        context: import("./communication-service").CommunicationContext,
    ): Promise<CommunicationConversation | null> {
        assertValidOwnership(context.ownership);
        const conversation = this.conversations.get(conversationId);
        if (!conversation) return null;
        if (!this.sameOwnership(conversation.ownership, context.ownership)) {
            return null;
        }
        return conversation;
    }

    private getOrCreateConversation(
        conversationId: string,
        channel: CommunicationConversation["channel"],
        participant: CommunicationConversation["participants"][number],
        context: import("./communication-service").CommunicationContext,
    ): CommunicationConversation {
        assertValidOwnership(context.ownership);
        const existing = this.conversations.get(conversationId);

        if (existing) {
            if (!this.sameOwnership(existing.ownership, context.ownership)) {
                throw new Error("COMMUNICATION_CONVERSATION_OWNERSHIP_MISMATCH");
            }
            return existing;
        }

        const now = new Date().toISOString();
        const conversation: CommunicationConversation = {
            id: conversationId,
            channel,
            ownership: context.ownership,
            participants: [participant],
            messages: [],
            status: "active",
            createdAt: now,
            updatedAt: now,
        };

        this.conversations.set(conversationId, conversation);
        return conversation;
    }



    private sameOwnership(
        left: CommunicationConversation["ownership"],
        right: CommunicationConversation["ownership"],
    ): boolean {
        if (left.scope !== right.scope) return false;
        if (left.scope === "COMPANY" && right.scope === "COMPANY") {
            return left.companyId === right.companyId;
        }
        if (left.scope === "SPACE" && right.scope === "SPACE") {
            return left.spaceId === right.spaceId;
        }
        return true;
    }

    private createId(prefix: string): string {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    }
}
