import { AgentResult, AgentTask } from "../agents/interface";
import {
    AgentDelegationRequest,
    AgentDelegationResult,
    AgentDelegationService,
} from "./agent-delegation.service";

export type AgentTaskLifecycleStatus =
    | "planned"
    | "assigned"
    | "executing"
    | "completed"
    | "failed"
    | "blocked";

export interface AgentTaskRecord {
    task: AgentTask;
    fromAgentId: string;
    toAgentId: string;
    status: AgentTaskLifecycleStatus;
    createdAt: string;
    assignedAt?: string;
    startedAt?: string;
    completedAt?: string;
    error?: string;
    agentResult?: AgentResult;
    communicationMessageId?: string;
    conversationId?: string;
}

export class AgentTaskLifecycleService {
    private readonly records = new Map<string, AgentTaskRecord>();

    constructor(
        private readonly delegationService = new AgentDelegationService(),
    ) {}

    plan(request: AgentDelegationRequest): AgentTaskRecord {
        const existing = this.records.get(request.task.id);
        if (existing) {
            return existing;
        }

        const record: AgentTaskRecord = {
            task: request.task,
            fromAgentId: request.fromAgentId,
            toAgentId: request.toAgentId,
            status: "planned",
            createdAt: new Date().toISOString(),
        };

        this.records.set(request.task.id, record);
        return record;
    }

    async execute(
        request: AgentDelegationRequest,
    ): Promise<AgentTaskRecord> {
        const record = this.plan(request);

        if (record.status === "completed") {
            return record;
        }

        record.status = "assigned";
        record.assignedAt = new Date().toISOString();

        record.status = "executing";
        record.startedAt = new Date().toISOString();

        const result = await this.delegationService.delegate(request);

        this.applyDelegationResult(record, result);
        return record;
    }

    get(taskId: string): AgentTaskRecord | undefined {
        return this.records.get(taskId);
    }

    private applyDelegationResult(
        record: AgentTaskRecord,
        result: AgentDelegationResult,
    ): void {
        record.communicationMessageId = result.communicationMessageId;
        record.conversationId = result.conversationId;
        record.agentResult = result.agentResult;
        record.error = result.error;

        if (result.status === "completed") {
            record.status = "completed";
            record.completedAt = result.agentResult?.completedAt ?? new Date().toISOString();
            return;
        }

        record.status = result.status;
        record.completedAt = new Date().toISOString();
    }
}
