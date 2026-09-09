import type { CapabilityResolver } from "../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import { ExecutiveIntentPlanBuilder } from "../planning/intent-plan-builder.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import {
    ExecutiveObjectiveEngine,
    type ExecutiveObjectiveRecord,
    type ExecutiveObjectiveStore,
    type ObjectiveAssessment,
} from "./objective-engine.js";
import { ExecutiveObjectiveIntentBridge } from "./objective-intent-bridge.js";
import { ExecutiveObjectiveInterventionEngine, type ObjectiveIntervention } from "./objective-intervention.js";
import { ExecutiveObjectiveProgressTrendScorer, type ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import { ExecutiveObjectiveUrgencyScorer, type ObjectiveUrgencyScore } from "./objective-urgency.js";
import type { ExecutiveState } from "./executive-state.js";
import { ExecutiveLearningEngine, InMemoryExecutiveMemoryStore, type ExecutiveLearningRecord, type ExecutiveMemoryStore } from "./executive-memory.js";
import { MemoryAwareStrategyEngine, type MemoryAwareStrategyDecision } from "./memory-aware-strategy.js";
import { ExecutiveAdaptiveInterventionPolicy, type AdaptiveInterventionDecision } from "./adaptive-intervention-policy.js";
import { ExecutiveWorkArbitrator, type ExecutiveWorkArbitrationDecision, type ExecutiveWorkCandidate } from "./executive-work-arbitrator.js";
import {
    ExecutiveCapacityGate,
    type ExecutiveCapacityDecision,
    type ExecutiveCapacityRequirement,
} from "./executive-capacity-gate.js";

export interface ObjectiveDrivenCycleResult {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
    readonly intervention: ObjectiveIntervention;
    readonly learning: readonly ExecutiveLearningRecord[];
    readonly strategy: MemoryAwareStrategyDecision;
    readonly adaptiveIntervention: AdaptiveInterventionDecision;
    readonly intent: ExecutiveIntent;
    readonly plan?: ExecutionPlan;
    readonly capacity?: ExecutiveCapacityDecision;
}

export interface ObjectiveDrivenExecutiveCycleOptions {
    readonly maxSelections?: number;
    readonly capacityGate?: ExecutiveCapacityGate;
    readonly resourceRequirements?: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveCapacityRequirement[];
}

/** Connects objective assessment, V8-C arbitration, V8-D capacity gating, planning, and V8-B execution preparation. */
export class ObjectiveDrivenExecutiveCycle {
    private readonly objectiveEngine: ExecutiveObjectiveEngine;
    private readonly intentBridge = new ExecutiveObjectiveIntentBridge();
    private readonly interventionEngine = new ExecutiveObjectiveInterventionEngine();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;
    private readonly arbitrator: ExecutiveWorkArbitrator;
    private readonly capacityGate?: ExecutiveCapacityGate;
    private readonly resourceRequirements: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveCapacityRequirement[];
    private readonly urgencyScorer = new ExecutiveObjectiveUrgencyScorer();
    private readonly progressTrendScorer = new ExecutiveObjectiveProgressTrendScorer();
    private readonly learningEngine: ExecutiveLearningEngine;
    private readonly strategyEngine = new MemoryAwareStrategyEngine();
    private readonly adaptivePolicy = new ExecutiveAdaptiveInterventionPolicy();

    constructor(
        objectiveStore: ExecutiveObjectiveStore,
        capabilityResolver: CapabilityResolver,
        memoryStore: ExecutiveMemoryStore = new InMemoryExecutiveMemoryStore(),
        options: ObjectiveDrivenExecutiveCycleOptions = {},
    ) {
        this.objectiveEngine = new ExecutiveObjectiveEngine(objectiveStore);
        this.planBuilder = new ExecutiveIntentPlanBuilder(capabilityResolver);
        this.arbitrator = new ExecutiveWorkArbitrator({ maxSelections: options.maxSelections ?? 1 });
        this.capacityGate = options.capacityGate;
        this.resourceRequirements = options.resourceRequirements ?? (() => []);
        this.learningEngine = new ExecutiveLearningEngine(memoryStore);
    }

    async run(
        state: ExecutiveState,
        capabilities: IntentPlanCapabilityMap,
        now = new Date(),
    ): Promise<readonly ObjectiveDrivenCycleResult[]> {
        const objectives = await this.objectiveEngine.listActive();
        const learning = await this.learningEngine.learn();
        const candidates: ExecutiveWorkCandidate[] = [];

        for (const objective of objectives) {
            const assessment = await this.objectiveEngine.assess(objective, state);
            candidates.push({
                objective,
                assessment,
                urgency: this.urgencyScorer.score({ objective, assessment, now }),
                progressTrend: this.progressTrendScorer.score(objective),
            });
        }

        const arbitration: ExecutiveWorkArbitrationDecision = this.arbitrator.arbitrate(candidates);
        const capacity = this.capacityGate?.admit(arbitration.selected, this.resourceRequirements);
        const selected = capacity?.selected ?? arbitration.selected;
        const results: ObjectiveDrivenCycleResult[] = [];

        for (const { objective, assessment, urgency, progressTrend } of selected) {
            const intervention = this.interventionEngine.assess({ objective, assessment, progressTrend });
            const strategicObjective = {
                objectiveId: objective.id,
                title: objective.title,
                priority: objective.priority,
                horizon: "MEDIUM_TERM" as const,
                strategicScore: urgency.score + progressTrend.interventionScore,
                dependencyIds: [],
                conflictIds: [],
            };
            const strategy = this.strategyEngine.evaluate({ objective: strategicObjective, learning });
            const adaptiveIntervention = this.adaptivePolicy.evaluate({ intervention, strategy });
            const adaptedIntervention: ObjectiveIntervention = {
                ...intervention,
                reason: adaptiveIntervention.reason,
                evidence: adaptiveIntervention.evidence,
            };
            const actionableIntervention = intervention.type !== "NO_INTERVENTION" && intervention.interventionRequired;
            const bridgedIntent = this.intentBridge.build({
                objective,
                assessment,
                intervention: actionableIntervention
                    ? adaptedIntervention
                    : adaptiveIntervention.mode === "CONTINUE" ? undefined : adaptedIntervention,
            });
            const intent: ExecutiveIntent = actionableIntervention
                ? { ...bridgedIntent, type: intervention.type === "RECOVER_FAILED_WORK" ? "RECOVER_FAILED_WORK" : "INTERVENE_OBJECTIVE" }
                : bridgedIntent;

            if (!actionableIntervention) {
                results.push({ objective, assessment, urgency, progressTrend, intervention, learning, strategy, adaptiveIntervention, intent, capacity });
                continue;
            }

            const plan = this.planBuilder.build({ intent, capabilities });
            results.push({ objective, assessment, urgency, progressTrend, intervention, learning, strategy, adaptiveIntervention, intent, plan, capacity });
        }

        return results;
    }
}
