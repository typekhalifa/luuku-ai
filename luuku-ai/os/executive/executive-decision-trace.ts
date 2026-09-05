import type { ExecutionDecision } from "./execution-decision.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import type { ExecutiveObservation } from "./executive-observation.js";
import type { AutonomyPolicyResult } from "./autonomy-policy.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";

export type ExecutiveTraceStage =
    | "OBSERVATION"
    | "INTENT"
    | "PLAN"
    | "POLICY"
    | "DECISION"
    | "SUBMISSION"
    | "CONTINUATION"
    | "EXECUTION"
    | "OUTCOME"
    | "MEMORY";

export interface ExecutiveTraceEvent {
    readonly id: string;
    readonly traceId: string;
    readonly stage: ExecutiveTraceStage;
    readonly timestamp: Date;
    readonly summary: string;
    readonly evidence: Record<string, unknown>;
}

export interface ExecutiveDecisionTrace {
    readonly id: string;
    readonly intentId: string;
    readonly objective: string;
    readonly startedAt: Date;
    readonly completedAt?: Date;
    readonly events: readonly ExecutiveTraceEvent[];
}

export interface ExecutiveDecisionTraceStore {
    list(): Promise<readonly ExecutiveDecisionTrace[]>;
    save(trace: ExecutiveDecisionTrace): Promise<void>;
}

export class InMemoryExecutiveDecisionTraceStore implements ExecutiveDecisionTraceStore {
    private readonly traces = new Map<string, ExecutiveDecisionTrace>();

    async list(): Promise<readonly ExecutiveDecisionTrace[]> {
        return [...this.traces.values()].sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime());
    }

    async save(trace: ExecutiveDecisionTrace): Promise<void> {
        if (this.traces.has(trace.id)) {
            throw new Error(`Executive decision trace already exists: ${trace.id}`);
        }
        validateTrace(trace);
        this.traces.set(trace.id, trace);
    }
}

export interface ExecutiveDecisionTraceInput {
    readonly traceId: string;
    readonly intent: ExecutiveIntent;
    readonly observation?: ExecutiveObservation;
    readonly plan?: ExecutionPlan;
    readonly policy?: AutonomyPolicyResult;
    readonly decision?: ExecutionDecision;
    readonly submission?: {
        readonly status: string;
        readonly workflowId?: string;
    };
    readonly continuation?: {
        readonly status: string;
        readonly queueItemId?: string;
    };
    readonly execution?: {
        readonly status: string;
        readonly evidence?: Record<string, unknown>;
    };
    readonly outcome?: {
        readonly status: string;
        readonly success: boolean;
        readonly evidence?: Record<string, unknown>;
    };
    readonly memory?: {
        readonly recorded: boolean;
        readonly memoryId?: string;
    };
    readonly startedAt?: Date;
    readonly completedAt?: Date;
}

/** Builds an ordered, reconstructable record of an executive decision lifecycle. */
export function buildExecutiveDecisionTrace(input: ExecutiveDecisionTraceInput): ExecutiveDecisionTrace {
    const startedAt = input.startedAt ?? new Date();
    const events: ExecutiveTraceEvent[] = [];
    let sequence = 0;

    const add = (
        stage: ExecutiveTraceStage,
        summary: string,
        evidence: Record<string, unknown>,
    ): void => {
        events.push({
            id: `${input.traceId}:${++sequence}`,
            traceId: input.traceId,
            stage,
            timestamp: new Date(startedAt.getTime() + sequence),
            summary,
            evidence,
        });
    };

    if (input.observation) {
        add("OBSERVATION", input.observation.message, {
            observationId: input.observation.id,
            type: input.observation.type,
            severity: input.observation.severity,
            ...input.observation.evidence,
        });
    }

    add("INTENT", input.intent.reason, {
        intentId: input.intent.id,
        type: input.intent.type,
        objective: input.intent.objective,
        sourceObservationIds: [...input.intent.sourceObservationIds],
        ...input.intent.evidence,
    });

    if (input.plan) {
        add("PLAN", `Plan created for ${input.plan.goal}.`, {
            planId: input.plan.id,
            sourcePlanId: input.plan.sourcePlanId,
            stepCount: input.plan.steps.length,
            requiresFounderApproval: input.plan.requiresFounderApproval,
            steps: input.plan.steps.map((step) => ({
                taskId: step.taskId,
                agentId: step.agentId,
                capability: step.capability,
                dependsOn: [...step.dependsOn],
            })),
        });
    }

    if (input.policy) {
        add("POLICY", input.policy.reason, {
            decision: input.policy.decision,
            requiresFounderApproval: input.policy.requiresFounderApproval,
            ...input.policy.evidence,
        });
    }

    if (input.decision) {
        add("DECISION", input.decision.reason, {
            decisionId: input.decision.id,
            status: input.decision.status,
            requiresFounderApproval: input.decision.requiresFounderApproval,
            ...input.decision.evidence,
        });
    }

    if (input.submission) {
        add("SUBMISSION", `Submission status: ${input.submission.status}.`, {
            status: input.submission.status,
            ...(input.submission.workflowId ? { workflowId: input.submission.workflowId } : {}),
        });
    }

    if (input.continuation) {
        add("CONTINUATION", `Continuation status: ${input.continuation.status}.`, {
            status: input.continuation.status,
            ...(input.continuation.queueItemId ? { queueItemId: input.continuation.queueItemId } : {}),
        });
    }

    if (input.execution) {
        add("EXECUTION", `Execution status: ${input.execution.status}.`, {
            status: input.execution.status,
            ...(input.execution.evidence ?? {}),
        });
    }

    if (input.outcome) {
        add("OUTCOME", `Outcome: ${input.outcome.status}.`, {
            status: input.outcome.status,
            success: input.outcome.success,
            ...(input.outcome.evidence ?? {}),
        });
    }

    if (input.memory) {
        add("MEMORY", input.memory.recorded ? "Executive memory recorded." : "Executive memory was not recorded.", {
            recorded: input.memory.recorded,
            ...(input.memory.memoryId ? { memoryId: input.memory.memoryId } : {}),
        });
    }

    const trace: ExecutiveDecisionTrace = {
        id: input.traceId,
        intentId: input.intent.id,
        objective: input.intent.objective,
        startedAt,
        ...(input.completedAt ? { completedAt: input.completedAt } : {}),
        events,
    };

    validateTrace(trace);
    return trace;
}

function validateTrace(trace: ExecutiveDecisionTrace): void {
    if (!trace.id.trim()) throw new Error("Executive decision trace requires an id.");
    if (!trace.intentId.trim()) throw new Error("Executive decision trace requires an intentId.");
    if (trace.events.length === 0) throw new Error(`Executive decision trace ${trace.id} has no events.`);

    for (let index = 0; index < trace.events.length; index += 1) {
        const event = trace.events[index];
        if (event.traceId !== trace.id) throw new Error(`Trace event ${event.id} references another trace.`);
        if (index > 0 && event.timestamp.getTime() <= trace.events[index - 1].timestamp.getTime()) {
            throw new Error(`Trace events must be strictly ordered: ${trace.id}.`);
        }
    }
}
