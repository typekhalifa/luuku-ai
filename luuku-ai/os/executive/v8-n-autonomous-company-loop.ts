import type { ExecutiveException, ExecutiveExceptionSignal } from "./v8-m-exception-management.js";
import { ExecutiveExceptionManagementEngine } from "./v8-m-exception-management.js";

export type AutonomousCompanyLoopBoundary = "ORCHESTRATION_ONLY";

export type AutonomousCompanyLoopAction =
    | "OBSERVE"
    | "SELECT_WORK"
    | "PRIORITIZE"
    | "PLAN"
    | "INTERVENE"
    | "EXECUTE_THROUGH_V6"
    | "LEARN"
    | "REMEMBER"
    | "EVOLVE_STRATEGY"
    | "MANAGE_EXCEPTION";

export interface AutonomousCompanyLoopObservation {
    readonly observedAt: string;
    readonly exceptionSignals?: readonly ExecutiveExceptionSignal[];
    readonly hasRunnableWork?: boolean;
    readonly hasStrategicPlan?: boolean;
    readonly interventionRequired?: boolean;
    readonly executionApproved?: boolean;
}

export interface AutonomousCompanyLoopCycle {
    readonly cycleId: string;
    readonly startedAt: string;
    readonly completedAt: string;
    readonly actions: readonly AutonomousCompanyLoopAction[];
    readonly exceptions: readonly ExecutiveException[];
    readonly executionPermitted: boolean;
    readonly executionBlockReason?: "CRITICAL_EXCEPTION" | "EXECUTION_NOT_APPROVED";
    readonly executionBoundary: AutonomousCompanyLoopBoundary;
}

/**
 * V8-N is the orchestration boundary that composes the already-authorized
 * executive capabilities into one bounded company loop. It describes and
 * gates lifecycle transitions; it does not itself execute work or bypass V6.
 */
export class AutonomousCompanyLoopEngine {
    private readonly exceptionManager = new ExecutiveExceptionManagementEngine();

    runCycle(observation: AutonomousCompanyLoopObservation): AutonomousCompanyLoopCycle {
        this.validate(observation);

        const actions: AutonomousCompanyLoopAction[] = ["OBSERVE"];
        const exceptions = this.exceptionManager.classifyMany(observation.exceptionSignals ?? []);
        const hasCriticalException = exceptions.some((exception) => exception.severity === "CRITICAL");
        const executionPermitted = Boolean(observation.executionApproved) && !hasCriticalException;

        if (exceptions.length > 0) {
            actions.push("MANAGE_EXCEPTION");
        }

        if (observation.hasRunnableWork) {
            actions.push("SELECT_WORK", "PRIORITIZE");
        }

        if (observation.hasStrategicPlan) {
            actions.push("PLAN");
        }

        if (observation.interventionRequired) {
            actions.push("INTERVENE");
        }

        if (executionPermitted) {
            actions.push("EXECUTE_THROUGH_V6");
        }

        actions.push("LEARN", "REMEMBER", "EVOLVE_STRATEGY");

        const startedAt = observation.observedAt;
        const completedAt = new Date(Date.parse(startedAt) + 1).toISOString();

        return {
            cycleId: this.createCycleId(observation),
            startedAt,
            completedAt,
            actions,
            exceptions,
            executionPermitted,
            executionBlockReason: executionPermitted
                ? undefined
                : hasCriticalException
                    ? "CRITICAL_EXCEPTION"
                    : "EXECUTION_NOT_APPROVED",
            executionBoundary: "ORCHESTRATION_ONLY",
        };
    }

    private createCycleId(observation: AutonomousCompanyLoopObservation): string {
        const key = [
            observation.observedAt,
            String(observation.hasRunnableWork ?? false),
            String(observation.hasStrategicPlan ?? false),
            String(observation.interventionRequired ?? false),
            String(observation.executionApproved ?? false),
            (observation.exceptionSignals ?? []).map((signal) => `${signal.type}:${signal.description}`).sort().join(","),
        ].join("|");

        let hash = 2166136261;
        for (let index = 0; index < key.length; index += 1) {
            hash ^= key.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }

        return `company-cycle:${(hash >>> 0).toString(16)}`;
    }

    private validate(observation: AutonomousCompanyLoopObservation): void {
        if (Number.isNaN(Date.parse(observation.observedAt))) {
            throw new Error(`Autonomous company loop failed: observedAt is invalid: ${observation.observedAt}.`);
        }
    }
}
