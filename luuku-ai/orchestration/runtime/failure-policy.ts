import { AgentResult } from "../../shared/agents/interface.js";

export interface FailurePolicy {
    maxAttempts: number;
    baseBackoffMs: number;
    maxBackoffMs: number;
}

export interface FailureDecision {
    action: "retry" | "fail" | "block";
    delayMs: number;
    reason: string;
}

export const defaultFailurePolicy: FailurePolicy = {
    maxAttempts: 3,
    baseBackoffMs: 1_000,
    maxBackoffMs: 60_000,
};

export function decideFailure(
    result: AgentResult,
    attempts: number,
    policy: FailurePolicy = defaultFailurePolicy,
): FailureDecision {
    if (result.executionStatus === "blocked" || result.verified === false && result.executed === true) {
        return {
            action: "block",
            delayMs: 0,
            reason: result.summary,
        };
    }

    if (attempts >= policy.maxAttempts) {
        return {
            action: "fail",
            delayMs: 0,
            reason: `Maximum retry attempts (${policy.maxAttempts}) reached.`,
        };
    }

    const delayMs = Math.min(
        policy.baseBackoffMs * (2 ** Math.max(0, attempts - 1)),
        policy.maxBackoffMs,
    );

    return {
        action: "retry",
        delayMs,
        reason: result.summary,
    };
}
