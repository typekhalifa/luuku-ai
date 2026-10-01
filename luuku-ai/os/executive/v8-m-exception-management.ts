export type ExecutiveExceptionType =
    | "OBJECTIVE_INVALIDATED"
    | "OBJECTIVE_STALLED"
    | "DEPENDENCY_BLOCKED"
    | "REPEATED_FAILURE"
    | "ECONOMIC_ASSUMPTION_BROKEN"
    | "CAPACITY_CONSTRAINT"
    | "STRATEGIC_CONFLICT"
    | "PLAN_STALE"
    | "SAFETY_BOUNDARY"
    | "APPROVAL_REQUIRED"
    | "EXECUTIVE_STATE_CHANGE";

export type ExecutiveExceptionSeverity = "ROUTINE" | "SERIOUS" | "CRITICAL";

export type ExecutiveExceptionResponse =
    | "CONTINUE_OBSERVATION"
    | "ADAPT_INTERVENTION"
    | "REPLAN_STRATEGY"
    | "ESCALATE_EXECUTIVE"
    | "HALT_PENDING_REVIEW";

export type ExceptionManagementBoundary = "MANAGEMENT_ONLY";

export interface ExecutiveExceptionSignal {
    readonly type: ExecutiveExceptionType;
    readonly objectiveIds?: readonly string[];
    readonly description: string;
    readonly detectedAt: string;
    readonly evidence?: Readonly<Record<string, unknown>>;
    readonly repeatedFailureCount?: number;
}

export interface ExecutiveException {
    readonly exceptionId: string;
    readonly type: ExecutiveExceptionType;
    readonly severity: ExecutiveExceptionSeverity;
    readonly objectiveIds: readonly string[];
    readonly description: string;
    readonly detectedAt: string;
    readonly recommendedResponse: ExecutiveExceptionResponse;
    readonly escalationRequired: boolean;
    readonly executionBoundary: ExceptionManagementBoundary;
    readonly evidence: Readonly<Record<string, unknown>>;
}

const CRITICAL_TYPES: ReadonlySet<ExecutiveExceptionType> = new Set([
    "SAFETY_BOUNDARY",
    "APPROVAL_REQUIRED",
]);

const REPLAN_TYPES: ReadonlySet<ExecutiveExceptionType> = new Set([
    "OBJECTIVE_INVALIDATED",
    "ECONOMIC_ASSUMPTION_BROKEN",
    "STRATEGIC_CONFLICT",
    "PLAN_STALE",
    "EXECUTIVE_STATE_CHANGE",
]);

const ADAPT_TYPES: ReadonlySet<ExecutiveExceptionType> = new Set([
    "OBJECTIVE_STALLED",
    "DEPENDENCY_BLOCKED",
    "CAPACITY_CONSTRAINT",
    "REPEATED_FAILURE",
]);

/**
 * Classifies normalized executive exception signals and chooses a bounded
 * management response. It does not execute work, mutate objectives, create
 * plans, bypass V6, or grant approval.
 */
export class ExecutiveExceptionManagementEngine {
    classify(signal: ExecutiveExceptionSignal): ExecutiveException {
        this.validate(signal);

        const objectiveIds = [...new Set(signal.objectiveIds ?? [])].sort();
        const repeatedFailureCount = signal.repeatedFailureCount ?? 0;
        const severity = this.determineSeverity(signal.type, repeatedFailureCount);
        const recommendedResponse = this.determineResponse(signal.type, severity);

        return {
            exceptionId: this.createExceptionId(signal, objectiveIds),
            type: signal.type,
            severity,
            objectiveIds,
            description: signal.description.trim(),
            detectedAt: signal.detectedAt,
            recommendedResponse,
            escalationRequired:
                severity === "CRITICAL" || recommendedResponse === "ESCALATE_EXECUTIVE" || recommendedResponse === "HALT_PENDING_REVIEW",
            executionBoundary: "MANAGEMENT_ONLY",
            evidence: {
                ...(signal.evidence ?? {}),
                repeatedFailureCount,
                source: "v8-m-exception-management",
            },
        };
    }

    classifyMany(signals: readonly ExecutiveExceptionSignal[]): readonly ExecutiveException[] {
        return signals
            .map((signal) => this.classify(signal))
            .sort((left, right) => {
                const severityRank: Record<ExecutiveExceptionSeverity, number> = {
                    CRITICAL: 0,
                    SERIOUS: 1,
                    ROUTINE: 2,
                };

                return severityRank[left.severity] - severityRank[right.severity]
                    || left.type.localeCompare(right.type)
                    || left.exceptionId.localeCompare(right.exceptionId);
            });
    }

    private determineSeverity(
        type: ExecutiveExceptionType,
        repeatedFailureCount: number,
    ): ExecutiveExceptionSeverity {
        if (CRITICAL_TYPES.has(type)) {
            return "CRITICAL";
        }

        if (type === "REPEATED_FAILURE" && repeatedFailureCount >= 3) {
            return "SERIOUS";
        }

        if (type === "OBJECTIVE_STALLED" || type === "DEPENDENCY_BLOCKED" || type === "CAPACITY_CONSTRAINT") {
            return "ROUTINE";
        }

        return "SERIOUS";
    }

    private determineResponse(
        type: ExecutiveExceptionType,
        severity: ExecutiveExceptionSeverity,
    ): ExecutiveExceptionResponse {
        if (severity === "CRITICAL") {
            return type === "SAFETY_BOUNDARY"
                ? "HALT_PENDING_REVIEW"
                : "ESCALATE_EXECUTIVE";
        }

        if (REPLAN_TYPES.has(type)) {
            return "REPLAN_STRATEGY";
        }

        if (ADAPT_TYPES.has(type)) {
            return "ADAPT_INTERVENTION";
        }

        return "CONTINUE_OBSERVATION";
    }

    private createExceptionId(
        signal: ExecutiveExceptionSignal,
        objectiveIds: readonly string[],
    ): string {
        const key = [
            signal.type,
            objectiveIds.join(","),
            signal.detectedAt,
            signal.description.trim(),
        ].join("|");

        let hash = 2166136261;
        for (let index = 0; index < key.length; index += 1) {
            hash ^= key.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return `exception:${signal.type.toLowerCase()}:${(hash >>> 0).toString(16)}`;
    }

    private validate(signal: ExecutiveExceptionSignal): void {
        if (!signal.description.trim()) {
            throw new Error("Exception management failed: description is required.");
        }

        if (Number.isNaN(Date.parse(signal.detectedAt))) {
            throw new Error(`Exception management failed: detectedAt is invalid: ${signal.detectedAt}.`);
        }

        if (signal.repeatedFailureCount !== undefined
            && (!Number.isInteger(signal.repeatedFailureCount) || signal.repeatedFailureCount < 0)) {
            throw new Error("Exception management failed: repeatedFailureCount must be a non-negative integer.");
        }

        if (signal.objectiveIds?.some((objectiveId) => !objectiveId.trim())) {
            throw new Error("Exception management failed: objectiveIds cannot contain empty identifiers.");
        }
    }
}
