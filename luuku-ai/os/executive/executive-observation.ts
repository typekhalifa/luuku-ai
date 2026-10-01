import type { ExecutiveState } from "./executive-state.js";

export type ExecutiveObservationSeverity = "INFO" | "ATTENTION" | "CRITICAL";

export interface ExecutiveObservation {
    id: string;
    type: "ACTIVE_WORK" | "PENDING_APPROVAL" | "FAILED_WORK" | "NO_ACTIVE_WORK";
    severity: ExecutiveObservationSeverity;
    message: string;
    evidence: Record<string, unknown>;
}

export interface ExecutiveObservationSnapshot {
    observedAt: Date;
    state: ExecutiveState;
    observations: readonly ExecutiveObservation[];
}

/** Pure executive observation layer: reads projected truth and produces facts, never actions. */
export class ExecutiveObservationLoop {
    observe(state: ExecutiveState): ExecutiveObservationSnapshot {
        const observations: ExecutiveObservation[] = [];

        if (state.active > 0) {
            observations.push({
                id: "active-work",
                type: "ACTIVE_WORK",
                severity: "INFO",
                message: `${state.active} work item${state.active === 1 ? " is" : "s are"} active.`,
                evidence: { active: state.active },
            });
        }

        if (state.waitingApproval > 0) {
            observations.push({
                id: "pending-approval",
                type: "PENDING_APPROVAL",
                severity: "ATTENTION",
                message: `${state.waitingApproval} work item${state.waitingApproval === 1 ? " is" : "s are"} waiting for founder approval.`,
                evidence: { waitingApproval: state.waitingApproval, attention: [...state.attention] },
            });
        }

        if (state.failed > 0) {
            observations.push({
                id: "failed-work",
                type: "FAILED_WORK",
                severity: "CRITICAL",
                message: `${state.failed} work item${state.failed === 1 ? " has" : "s have"} failed.`,
                evidence: {
                    failed: state.failed,
                    failedWorkIds: [...(state.failedWorkIds ?? [])],
                },
            });
        }

        if (state.active === 0 && state.waitingApproval === 0 && state.failed === 0) {
            observations.push({
                id: "no-active-work",
                type: "NO_ACTIVE_WORK",
                severity: "INFO",
                message: "No active, approval-blocked, or failed work is currently projected.",
                evidence: { active: 0, waitingApproval: 0, failed: 0 },
            });
        }

        return {
            observedAt: new Date(),
            state,
            observations,
        };
    }
}
