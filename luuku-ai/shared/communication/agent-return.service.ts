import { AgentResult } from "../agents/interface";
import { getRegisteredAgent } from "../agents/registry";
import { CommunicationService } from "./communication-service";
import { InMemoryCommunicationService } from "./in-memory-communication-service";

export interface AgentReturnRequest {
    fromAgentId: string;
    toAgentId: string;
    taskId: string;
    conversationId: string;
    result: AgentResult;
}

export interface AgentReturnResult {
    status: "completed" | "failed" | "blocked";
    communicationMessageId?: string;
    conversationId?: string;
    error?: string;
}

export class AgentReturnService {
    private readonly communicationService: CommunicationService;

    constructor(
        communicationService: CommunicationService = new InMemoryCommunicationService(),
    ) {
        this.communicationService = communicationService;
    }

    async returnResult(
        request: AgentReturnRequest,
    ): Promise<AgentReturnResult> {
        const source = getRegisteredAgent(request.fromAgentId);
        const target = getRegisteredAgent(request.toAgentId);

        if (!source) {
            return { status: "blocked", error: "SOURCE_AGENT_NOT_REGISTERED" };
        }

        if (!target) {
            return { status: "blocked", error: "TARGET_AGENT_NOT_REGISTERED" };
        }

        if (source.agent.id === target.agent.id) {
            return { status: "blocked", error: "SELF_RETURN_NOT_ALLOWED" };
        }

        const message = await this.communicationService.sendMessage({
            conversationId: request.conversationId,
            channel: "internal",
            recipient: {
                channel: "internal",
                externalId: target.agent.id,
                displayName: target.agent.name,
            },
            content: request.result.summary,
            metadata: {
                type: "agent-delegation-result",
                fromAgentId: source.agent.id,
                toAgentId: target.agent.id,
                taskId: request.taskId,
                success: request.result.success,
                executionStatus: request.result.executionStatus,
                executed: request.result.executed,
                verified: request.result.verified,
                evidence: request.result.evidence,
                blockers: request.result.blockers,
                verificationNotes: request.result.verificationNotes,
                completedAt: request.result.completedAt,
            },
        });

        return {
            status: request.result.success ? "completed" : "failed",
            communicationMessageId: message.id,
            conversationId: request.conversationId,
            ...(request.result.success
                ? {}
                : { error: "SOURCE_AGENT_REPORTED_EXECUTION_FAILURE" }),
        };
    }
}
