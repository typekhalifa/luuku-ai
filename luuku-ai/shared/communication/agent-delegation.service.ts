import { AgentTask, AgentResult } from "../agents/interface";
import {
    getRegisteredAgent,
} from "../agents/registry";
import {
    AgentCommunicationTarget,
    canCommunicate,
} from "./agent-presence";
import {
    CommunicationService,
} from "./communication-service";
import {
    InMemoryCommunicationService,
} from "./in-memory-communication-service";

export interface AgentDelegationRequest {
    fromAgentId: string;
    toAgentId: string;
    task: AgentTask;
}

export interface AgentDelegationResult {
    status: "completed" | "blocked" | "failed";
    communicationMessageId?: string;
    conversationId?: string;
    agentResult?: AgentResult;
    error?: string;
}

export class AgentDelegationService {
    private readonly communicationService: CommunicationService;

    constructor(
        communicationService: CommunicationService = new InMemoryCommunicationService(),
    ) {
        this.communicationService = communicationService;
    }

    async delegate(
        request: AgentDelegationRequest,
    ): Promise<AgentDelegationResult> {
        const source = getRegisteredAgent(request.fromAgentId);
        const target = getRegisteredAgent(request.toAgentId);

        if (!source) {
            return {
                status: "blocked",
                error: "SOURCE_AGENT_NOT_REGISTERED",
            };
        }

        if (!target) {
            return {
                status: "blocked",
                error: "TARGET_AGENT_NOT_REGISTERED",
            };
        }

        if (source.agent.id === target.agent.id) {
            return {
                status: "blocked",
                error: "SELF_DELEGATION_NOT_ALLOWED",
            };
        }

        const presence = source.presence;

        if (!presence || !canCommunicate(presence, "agent" as AgentCommunicationTarget)) {
            return {
                status: "blocked",
                error: "SOURCE_AGENT_CANNOT_COMMUNICATE_WITH_AGENTS",
            };
        }

        if (
            presence.scope.allowedTargetDepartments &&
            presence.scope.allowedTargetDepartments.length > 0 &&
            !presence.scope.allowedTargetDepartments.includes(target.presence?.department ?? "")
        ) {
            return {
                status: "blocked",
                error: "TARGET_DEPARTMENT_NOT_ALLOWED",
            };
        }

        const conversationId = `agent:${source.agent.id}:${target.agent.id}`;

        const message = await this.communicationService.sendMessage({
            conversationId,
            channel: "internal",
            recipient: {
                channel: "internal",
                externalId: target.agent.id,
                displayName: target.agent.name,
            },
            content: request.task.description,
            metadata: {
                type: "agent-delegation",
                fromAgentId: source.agent.id,
                toAgentId: target.agent.id,
                taskId: request.task.id,
                taskTitle: request.task.title,
                priority: request.task.priority,
            },
        });

        try {
            const agentResult = await target.agent.execute(request.task);

            return {
                status: agentResult.success ? "completed" : "failed",
                communicationMessageId: message.id,
                conversationId,
                agentResult,
                ...(agentResult.success
                    ? {}
                    : { error: "TARGET_AGENT_EXECUTION_FAILED" }),
            };
        } catch (error) {
            return {
                status: "failed",
                communicationMessageId: message.id,
                conversationId,
                error: error instanceof Error ? error.message : String(error),
            };
        }
    }
}
