import {
    ExecutionResult,
    ExecutionStatus
} from "./types";

/**
 * A business-side mutation is allowed only after the external action
 * actually executed and its result was independently verified.
 *
 * This is intentionally stricter than `status === "completed"` so that
 * simulations, queued actions, partial executions, and unverified provider
 * responses can never become CRM reality.
 */
export function isVerifiedRealExecution(
    result: Pick<ExecutionResult, "status" | "executed" | "verified">
): boolean {
    const terminalRealStatus: ExecutionStatus[] = [
        "completed",
        "verified"
    ];

    return (
        result.executed === true &&
        result.verified === true &&
        terminalRealStatus.includes(result.status)
    );
}
