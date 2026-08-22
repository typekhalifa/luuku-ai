import {
    ExecutionEvidence,
    ExecutionStatus,
} from "../execution/types";

export interface AgentTask {
    id: string;
    title: string;
    description: string;
    priority: "low" | "medium" | "high";
    /**
     * Optional machine-readable execution context. Existing agents can
     * ignore it; newer agents can use it instead of parsing prose.
     */
    metadata?: Record<string, unknown>;
}

export interface AgentResult {
    success: boolean;
    summary: string;
    completedAt: string;
    executionStatus?: ExecutionStatus;
    executed?: boolean;
    verified?: boolean;
    evidence?: ExecutionEvidence;
    verificationNotes?: string[];
    /**
     * Deterministic blockers returned when execution cannot proceed.
     * Optional so existing agent results remain backwards compatible.
     */
    blockers?: string[];
}

export interface Agent {
    id: string;
    name: string;
    role: string;

    execute(task: AgentTask): Promise<AgentResult>;
}
