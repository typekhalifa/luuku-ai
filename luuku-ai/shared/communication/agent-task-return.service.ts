import { AgentResult } from "../agents/interface";
import { AgentDelegationRequest } from "./agent-delegation.service";
import {
    AgentTaskRecord,
    AgentTaskLifecycleService,
} from "./agent-task-lifecycle.service";
import {
    AgentReturnRequest,
    AgentReturnResult,
    AgentReturnService,
} from "./agent-return.service";

export interface AgentTaskReturnRequest {
    delegation: AgentDelegationRequest;
    conversationId: string;
    result: AgentResult;
}

export interface AgentTaskReturnResult {
    returnResult: AgentReturnResult;
    taskRecord: AgentTaskRecord;
}

/**
 * Closes the loop between an agent result, the internal communication return,
 * and the originating task lifecycle.
 */
export class AgentTaskReturnService {
    constructor(
        private readonly returnService = new AgentReturnService(),
        private readonly lifecycleService = new AgentTaskLifecycleService(),
    ) {}

    async returnAndClose(
        request: AgentTaskReturnRequest,
    ): Promise<AgentTaskReturnResult> {
        const returnResult = await this.returnService.returnResult({
            fromAgentId: request.delegation.toAgentId,
            toAgentId: request.delegation.fromAgentId,
            taskId: request.delegation.task.id,
            conversationId: request.conversationId,
            result: request.result,
        } satisfies AgentReturnRequest);

        const taskRecord = this.lifecycleService.applyReturnedResult(
            request.delegation.task.id,
            request.result,
            returnResult.communicationMessageId,
            request.conversationId,
            returnResult.error,
        );

        return {
            returnResult,
            taskRecord,
        };
    }

    getTask(taskId: string): AgentTaskRecord | undefined {
        return this.lifecycleService.get(taskId);
    }
}
