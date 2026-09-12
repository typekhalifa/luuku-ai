import type { ExecutiveAdaptiveInterventionPolicy, AdaptiveInterventionDecision } from "./adaptive-intervention-policy.js";
import type { MemoryAwareStrategyDecision } from "./memory-aware-strategy.js";
import type { ObjectiveIntervention } from "./objective-intervention.js";
import type { ExecutiveInterventionSignal } from "./v8-j-intervention-adapter.js";

export interface CompanyStateAdaptiveInterventionInput {
    readonly signal: ExecutiveInterventionSignal;
    readonly objectiveIntervention: ObjectiveIntervention;
    readonly strategy: MemoryAwareStrategyDecision;
}

export interface CompanyStateAdaptiveInterventionDecision extends AdaptiveInterventionDecision {
    readonly companyStateSignalId: string;
    readonly companyStateDomain: ExecutiveInterventionSignal["domain"];
}

/**
 * V8-J adaptive decision boundary. It combines a company-state intervention
 * signal with objective and memory evidence, then reuses the existing bounded
 * adaptive intervention policy. It never selects agents, creates plans,
 * requests approval, allocates resources, or executes work.
 */
export class ExecutiveCompanyStateAdaptiveInterventionEngine {
    constructor(private readonly policy: ExecutiveAdaptiveInterventionPolicy) {}

    evaluate(input: CompanyStateAdaptiveInterventionInput): CompanyStateAdaptiveInterventionDecision {
        const decision = this.policy.evaluate({
            intervention: input.objectiveIntervention,
            strategy: input.strategy,
        });

        return {
            ...decision,
            companyStateSignalId: input.signal.id,
            companyStateDomain: input.signal.domain,
            evidence: {
                ...decision.evidence,
                companyStateSignalId: input.signal.id,
                companyStateSignalType: input.signal.type,
                companyStateSeverity: input.signal.severity,
                companyStateDomain: input.signal.domain,
                companyStateKey: input.signal.key,
            },
        };
    }
}
