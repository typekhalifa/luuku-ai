import type { ExecutiveDecisionTrace } from "./executive-decision-trace.js";

export type ExecutiveEvaluationDimension =
    | "OBSERVATION"
    | "INTENT"
    | "PLAN"
    | "POLICY"
    | "DECISION"
    | "EXECUTION"
    | "OUTCOME"
    | "MEMORY";

export type ExecutiveEvaluationStatus = "PASS" | "FAIL" | "INCONCLUSIVE";

export interface ExecutiveEvaluationCriterion {
    readonly dimension: ExecutiveEvaluationDimension;
    readonly passed: boolean;
    readonly reason: string;
    readonly weight: number;
}

export interface ExecutiveEvaluationResult {
    readonly id: string;
    readonly traceId: string;
    readonly status: ExecutiveEvaluationStatus;
    readonly score: number;
    readonly criteria: readonly ExecutiveEvaluationCriterion[];
    readonly summary: string;
    readonly evaluatedAt: Date;
}

/** Evaluates an executive trace against deterministic lifecycle-quality criteria. */
export class ExecutiveEvaluationFramework {
    evaluate(trace: ExecutiveDecisionTrace): ExecutiveEvaluationResult {
        const criteria: ExecutiveEvaluationCriterion[] = [
            criterion("OBSERVATION", hasStage(trace, "OBSERVATION"), "Observation evidence is present.", 1),
            criterion("INTENT", hasStage(trace, "INTENT"), "Intent is represented in the trace.", 1),
            criterion("PLAN", hasStage(trace, "PLAN"), "Execution plan is represented in the trace.", 1),
            criterion("POLICY", hasStage(trace, "POLICY"), "Autonomy policy decision is represented in the trace.", 1),
            criterion("DECISION", hasStage(trace, "DECISION"), "Execution eligibility decision is represented in the trace.", 1),
            criterion("EXECUTION", hasStage(trace, "EXECUTION"), "Runtime execution is represented in the trace.", 1),
            criterion("OUTCOME", hasStage(trace, "OUTCOME"), "Execution outcome is represented in the trace.", 1),
            criterion("MEMORY", hasStage(trace, "MEMORY"), "Learning/memory recording is represented in the trace.", 1),
        ];

        const score = Math.round(
            (criteria.reduce((total, item) => total + (item.passed ? item.weight : 0), 0) /
                criteria.reduce((total, item) => total + item.weight, 0)) * 100,
        );
        const status: ExecutiveEvaluationStatus = score === 100 ? "PASS" : score === 0 ? "FAIL" : "INCONCLUSIVE";

        return {
            id: `executive-evaluation-${trace.id}`,
            traceId: trace.id,
            status,
            score,
            criteria,
            summary: `${criteria.filter((item) => item.passed).length}/${criteria.length} evaluation criteria passed.`,
            evaluatedAt: new Date(),
        };
    }
}

function criterion(
    dimension: ExecutiveEvaluationDimension,
    passed: boolean,
    reason: string,
    weight: number,
): ExecutiveEvaluationCriterion {
    return { dimension, passed, reason, weight };
}

function hasStage(trace: ExecutiveDecisionTrace, stage: ExecutiveEvaluationDimension): boolean {
    return trace.events.some((event) => event.stage === stage);
}
