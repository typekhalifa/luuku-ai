export type FailureClass = "transient" | "permanent" | "approval_required" | "uncertain" | "max_attempts";

export interface FailureContext {
    summary: string;
    executionStatus?: string;
    executed?: boolean;
    verified?: boolean;
    attempts: number;
    maxAttempts: number;
    errorCode?: string;
}

export interface FailureClassification {
    class: FailureClass;
    action: "retry" | "fail" | "block" | "reconcile" | "escalate";
    reason: string;
}

const TRANSIENT_CODES = new Set([
    "ETIMEDOUT",
    "ECONNRESET",
    "ECONNREFUSED",
    "ENETUNREACH",
    "RATE_LIMITED",
    "TIMEOUT",
    "TEMPORARY_UNAVAILABLE",
]);

const PERMANENT_CODES = new Set([
    "INVALID_INPUT",
    "NOT_FOUND",
    "INVALID_REQUEST",
    "UNSUPPORTED_OPERATION",
]);

export function classifyFailure(context: FailureContext): FailureClassification {
    if (context.executed === true && context.verified === false) {
        return {
            class: "uncertain",
            action: "reconcile",
            reason: "Execution may have produced an external side effect, but its outcome is unverified.",
        };
    }

    if (context.executionStatus === "blocked" || context.errorCode === "APPROVAL_REQUIRED") {
        return {
            class: "approval_required",
            action: "block",
            reason: "Execution requires an explicit approval or intervention before it can continue.",
        };
    }

    if (context.attempts >= context.maxAttempts) {
        return {
            class: "max_attempts",
            action: "escalate",
            reason: `Maximum retry attempts (${context.maxAttempts}) reached.`,
        };
    }

    if (context.errorCode && PERMANENT_CODES.has(context.errorCode)) {
        return {
            class: "permanent",
            action: "fail",
            reason: `Permanent failure: ${context.errorCode}.`,
        };
    }

    if (context.errorCode && TRANSIENT_CODES.has(context.errorCode)) {
        return {
            class: "transient",
            action: "retry",
            reason: `Transient failure: ${context.errorCode}.`,
        };
    }

    return {
        class: "transient",
        action: "retry",
        reason: context.summary,
    };
}
