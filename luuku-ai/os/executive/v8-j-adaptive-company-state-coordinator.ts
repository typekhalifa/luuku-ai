import { ExecutiveAdaptiveInterventionPolicy } from "./adaptive-intervention-policy.js";
import type { CompanyStateAdaptiveInterventionDecision } from "./v8-j-adaptive-intervention.js";
import { ExecutiveCompanyStateAdaptiveInterventionEngine } from "./v8-j-adaptive-intervention.js";
import type { ExecutiveInterventionSignal } from "./v8-j-intervention-adapter.js";
import type { ObjectiveDrivenCycleResult } from "./objective-driven-executive-cycle.js";

export interface CompanyStateObjectiveResolution {
    readonly objectiveId?: string;
    readonly reason: string;
}

export interface ExecutiveAdaptiveCompanyStateCoordinatorOptions {
    /** Explicitly associates a company-state signal with an objective. */
    readonly resolveObjective: (signal: ExecutiveInterventionSignal) => CompanyStateObjectiveResolution | Promise<CompanyStateObjectiveResolution>;
}

export interface UnresolvedCompanyStateIntervention {
    readonly signalId: string;
    readonly reason: string;
}

export interface ExecutiveAdaptiveCompanyStateCoordinatorResult {
    readonly generatedAt: Date;
    readonly decisions: readonly CompanyStateAdaptiveInterventionDecision[];
    readonly unresolved: readonly UnresolvedCompanyStateIntervention[];
    readonly interventionRequired: boolean;
}

/**
 * V8-J orchestration bridge. It connects meaningful company-state intervention
 * signals to already-computed objective context and the bounded adaptive
 * intervention policy. Objective association is explicit: this coordinator
 * never guesses which objective owns a company-state signal.
 *
 * This boundary is decision-only. It never selects agents, creates plans,
 * requests approval, allocates resources, or executes work.
 */
export class ExecutiveAdaptiveCompanyStateCoordinator {
    private readonly adaptiveEngine: ExecutiveCompanyStateAdaptiveInterventionEngine;

    constructor(
        policy = new ExecutiveAdaptiveInterventionPolicy(),
    ) {
        this.adaptiveEngine = new ExecutiveCompanyStateAdaptiveInterventionEngine(policy);
    }

    async coordinate(
        signals: readonly ExecutiveInterventionSignal[],
        objectiveResults: readonly ObjectiveDrivenCycleResult[],
        options: ExecutiveAdaptiveCompanyStateCoordinatorOptions,
    ): Promise<ExecutiveAdaptiveCompanyStateCoordinatorResult> {
        const decisions: CompanyStateAdaptiveInterventionDecision[] = [];
        const unresolved: UnresolvedCompanyStateIntervention[] = [];

        for (const signal of signals) {
            if (signal.type === "NO_INTERVENTION") continue;

            const resolution = await options.resolveObjective(signal);
            if (!resolution.objectiveId) {
                unresolved.push({
                    signalId: signal.id,
                    reason: resolution.reason,
                });
                continue;
            }

            const objectiveResult = objectiveResults.find(
                (result) => result.objective.id === resolution.objectiveId,
            );
            if (!objectiveResult) {
                unresolved.push({
                    signalId: signal.id,
                    reason: `Resolved objective ${resolution.objectiveId} is not present in the current objective context.`,
                });
                continue;
            }

            decisions.push(this.adaptiveEngine.evaluate({
                signal,
                objectiveIntervention: objectiveResult.intervention,
                strategy: objectiveResult.strategy,
            }));
        }

        return {
            generatedAt: new Date(),
            decisions,
            unresolved,
            interventionRequired: decisions.length > 0 || unresolved.length > 0,
        };
    }
}
