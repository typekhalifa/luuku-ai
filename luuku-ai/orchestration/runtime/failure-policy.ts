import { AgentResult } from "../../shared/agents/interface";

export type FailureDisposition = "retry" | "failed" | "blocked";

export interface FailurePolicy {
    maxAttempts: number;
    backoffMs: (attempt: number) => number;
    decide(result: AgentResult, attempt: number): FailureDisposition;
}

export const defaultFailurePolicy: FailurePolicy = {
    maxAttempts: 3,
    backoffMs: (attempt) => Math.min(60_000, 1_000 * 2 ** Math.max(0, attempt - 1)),
    decide(result, attempt) {
        if (result.executionStatus === "blocked") return "blocked";
        if (result.success) return "failed";
        return attempt < 3 ? "retry" : "failed";
    },
};

export function decideFailure(policy: FailurePolicy, result: AgentResult, attempt: number): FailureDisposition {
    if (attempt < 1) throw new Error("attempt must be at least 1.");
    if (attempt >= policy.maxAttempts && !result.success && result.executionStatus !== "blocked") return "failed";
    return policy.decide(result, attempt);
}
