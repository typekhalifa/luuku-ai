import {
    AgentDelegationRequest,
} from "./agent-delegation.service";
import {
    AgentTaskLifecycleService,
    AgentTaskRecord,
} from "./agent-task-lifecycle.service";

export type AgentTaskRecoveryDecision =
    | "retry"
    | "blocked"
    | "completed"
    | "failed";

export interface AgentTaskRecoveryResult {
    decision: AgentTaskRecoveryDecision;
    record: AgentTaskRecord;
    attemptsRemaining: number;
    reason: string;
}

/**
 * Provides bounded recovery for failed agent tasks.
 * Blocked tasks are never retried automatically.
 */
export class AgentTaskRecoveryService {
    constructor(
        private readonly lifecycleService = new AgentTaskLifecycleService(),
    ) {}

    async recover(
        request: AgentDelegationRequest,
        maxAttempts = 2,
    ): Promise<AgentTaskRecoveryResult> {
        if (maxAttempts < 1) {
            throw new Error("MAX_ATTEMPTS_MUST_BE_POSITIVE");
        }

        const current = this.lifecycleService.get(request.task.id);

        if (!current) {
            const record = await this.lifecycleService.execute(request);
            return this.resultForRecord(record, maxAttempts);
        }

        if (current.status === "completed") {
            return {
                decision: "completed",
                record: this.snapshot(current),
                attemptsRemaining: Math.max(maxAttempts - current.attemptCount, 0),
                reason: "Task is already completed.",
            };
        }

        if (current.status === "blocked") {
            return {
                decision: "blocked",
                record: this.snapshot(current),
                attemptsRemaining: 0,
                reason: "Blocked tasks require review and are never auto-retried.",
            };
        }

        if (current.attemptCount >= maxAttempts) {
            return {
                decision: "failed",
                record: this.snapshot(current),
                attemptsRemaining: 0,
                reason: "Retry budget has been exhausted.",
            };
        }

        const record = await this.lifecycleService.execute(request);
        return this.resultForRecord(record, maxAttempts);
    }

    private resultForRecord(
        record: AgentTaskRecord,
        maxAttempts: number,
    ): AgentTaskRecoveryResult {
        const snapshot = this.snapshot(record);

        if (record.status === "completed") {
            return {
                decision: "completed",
                record: snapshot,
                attemptsRemaining: Math.max(maxAttempts - record.attemptCount, 0),
                reason: "Task completed successfully.",
            };
        }

        if (record.status === "blocked") {
            return {
                decision: "blocked",
                record: snapshot,
                attemptsRemaining: 0,
                reason: "Task is blocked and requires review.",
            };
        }

        if (record.attemptCount < maxAttempts) {
            return {
                decision: "retry",
                record: snapshot,
                attemptsRemaining: maxAttempts - record.attemptCount,
                reason: "Task failed and has retry budget remaining.",
            };
        }

        return {
            decision: "failed",
            record: snapshot,
            attemptsRemaining: 0,
            reason: "Task failed and has no retry budget remaining.",
        };
    }

    private snapshot(record: AgentTaskRecord): AgentTaskRecord {
        return {
            ...record,
            task: { ...record.task },
            agentResult: record.agentResult
                ? {
                      ...record.agentResult,
                      evidence: record.agentResult.evidence
                          ? { ...record.agentResult.evidence }
                          : undefined,
                      verificationNotes: record.agentResult.verificationNotes
                          ? [...record.agentResult.verificationNotes]
                          : undefined,
                      blockers: record.agentResult.blockers
                          ? [...record.agentResult.blockers]
                          : undefined,
                  }
                : undefined,
        };
    }
}
