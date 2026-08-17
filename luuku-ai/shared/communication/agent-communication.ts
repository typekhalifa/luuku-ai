import { getRegisteredAgent } from "../agents/registry";
import { ChannelIdentity } from "./channel";
import { CommunicationMessage } from "./message";
import { CommunicationService } from "./communication-service";
import { AgentPresence, canCommunicate } from "./agent-presence";

export interface AgentCommunicationRequest {
    senderAgentId: string;
    recipientAgentId: string;
    content: string;
    metadata?: Record<string, unknown>;
}

export interface AgentCommunicationResult {
    accepted: boolean;
    reason:
        | "sender-not-found"
        | "sender-presence-missing"
        | "recipient-not-found"
        | "recipient-presence-missing"
        | "target-department-blocked"
        | "agent-communication-blocked"
        | "sent";
    message?: CommunicationMessage;
}

function agentIdentity(
    presence: AgentPresence,
): ChannelIdentity {
    return {
        channel: "internal",
        externalId: presence.id,
        displayName: presence.name,
    };
}

function targetDepartmentAllowed(
    sender: AgentPresence,
    recipient: AgentPresence,
): boolean {
    const allowedDepartments = sender.scope.allowedTargetDepartments;

    if (!allowedDepartments || allowedDepartments.length === 0) {
        return true;
    }

    return allowedDepartments.includes(recipient.department);
}

export class AgentCommunicationService {
    constructor(
        private readonly communicationService: CommunicationService,
    ) {}

    async send(
        request: AgentCommunicationRequest,
    ): Promise<AgentCommunicationResult> {
        const sender = getRegisteredAgent(request.senderAgentId);

        if (!sender) {
            return {
                accepted: false,
                reason: "sender-not-found",
            };
        }

        if (!sender.presence) {
            return {
                accepted: false,
                reason: "sender-presence-missing",
            };
        }

        const recipient = getRegisteredAgent(request.recipientAgentId);

        if (!recipient) {
            return {
                accepted: false,
                reason: "recipient-not-found",
            };
        }

        if (!recipient.presence) {
            return {
                accepted: false,
                reason: "recipient-presence-missing",
            };
        }

        if (!canCommunicate(sender.presence, "agent")) {
            return {
                accepted: false,
                reason: "agent-communication-blocked",
            };
        }

        if (!targetDepartmentAllowed(sender.presence, recipient.presence)) {
            return {
                accepted: false,
                reason: "target-department-blocked",
            };
        }

        const senderIdentity = agentIdentity(sender.presence);
        const recipientIdentity = agentIdentity(recipient.presence);
        const conversationKey = [
            sender.presence.id,
            recipient.presence.id,
        ].sort().join(":");

        const message = await this.communicationService.receiveMessage({
            channel: "internal",
            sender: senderIdentity,
            content: request.content,
            externalConversationId: `agent:${conversationKey}`,
            metadata: {
                source: "agent-communication",
                senderAgentId: sender.presence.id,
                senderDepartment: sender.presence.department,
                recipientAgentId: recipient.presence.id,
                recipientDepartment: recipient.presence.department,
                recipient: recipientIdentity,
                ...(request.metadata || {}),
            },
        });

        return {
            accepted: true,
            reason: "sent",
            message,
        };
    }
}
