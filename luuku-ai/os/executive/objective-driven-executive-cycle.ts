import type { CapabilityResolver } from "../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import { ExecutiveIntentPlanBuilder } from "../planning/intent-plan-builder.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import { ExecutiveObjectiveEngine, type ExecutiveObjectiveRecord, type ExecutiveObjectiveStore, type ObjectiveAssessment } from "./objective-engine.js";
import { ExecutiveObjectiveIntentBridge } from "./objective-intent-bridge.js";
import { ExecutiveObjectiveInterventionEngine, type ObjectiveIntervention } from "./objective-intervention.js";
import { ExecutiveObjectiveProgressTrendScorer, type ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import { ExecutiveObjectiveUrgencyScorer, type ObjectiveUrgencyScore } from "./objective-urgency.js";
import type { ExecutiveState } from "./executive-state.js";
import { ExecutiveLearningEngine, InMemoryExecutiveMemoryStore, type ExecutiveLearningRecord, type ExecutiveMemoryStore } from "./executive-memory.js";
import { MemoryAwareStrategyEngine, type MemoryAwareStrategyDecision } from "./memory-aware-strategy.js";
import { ExecutiveAdaptiveInterventionPolicy, type AdaptiveInterventionDecision } from "./adaptive-intervention-policy.js";
import { ExecutiveWorkArbitrator, type ExecutiveWorkArbitrationDecision, type ExecutiveWorkCandidate } from "./executive-work-arbitrator.js";
import { ExecutiveCapacityGate, type ExecutiveCapacityDecision, type ExecutiveCapacityRequirement } from "./executive-capacity-gate.js";
import { ExecutiveResourceBudget, type ExecutiveBudgetCandidate, type ExecutiveBudgetRequirement, type ExecutiveBudgetResult } from "./executive-resource-budget.js";
import { ExecutiveTradeoffEngine, type ExecutiveTradeoffCandidate, type ExecutiveTradeoffResult } from "./executive-tradeoff-engine.js";
import { ExecutiveLearningAdaptationEngine, type ExecutiveLearningAdaptationDecision } from "./executive-learning-adaptation.js";
import { ExecutiveStrategyEvolutionEngine, type ExecutiveStrategyEvolutionDecision } from "./executive-strategy-evolution.js";

export interface ObjectiveDrivenCycleResult {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
    readonly intervention: ObjectiveIntervention;
    readonly learning: readonly ExecutiveLearningRecord[];
    readonly strategyEvolution: ExecutiveStrategyEvolutionDecision;
    readonly strategy: MemoryAwareStrategyDecision;
    readonly adaptiveIntervention: AdaptiveInterventionDecision;
    readonly intent: ExecutiveIntent;
    readonly plan?: ExecutionPlan;
    readonly capacity?: ExecutiveCapacityDecision;
    readonly budget?: ExecutiveBudgetResult;
    readonly tradeoff?: ExecutiveTradeoffResult;
    readonly learningAdaptation?: readonly ExecutiveLearningAdaptationDecision[];
}

export interface ObjectiveDrivenExecutiveCycleOptions {
    readonly maxSelections?: number;
    readonly capacityGate?: ExecutiveCapacityGate;
    readonly resourceRequirements?: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveCapacityRequirement[];
    readonly resourceBudget?: ExecutiveResourceBudget;
    readonly budgetRequirements?: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveBudgetRequirement[];
    readonly tradeoffEngine?: ExecutiveTradeoffEngine;
    readonly tradeoffInputs?: (candidate: ExecutiveWorkCandidate) => ExecutiveTradeoffCandidate;
    readonly learningAdaptation?: ExecutiveLearningAdaptationEngine;
    readonly strategyEvolution?: ExecutiveStrategyEvolutionEngine;
}

/** Connects objective assessment, V8-C arbitration, V8-D capacity gating, V8-E budget allocation, V8-F tradeoff economics, V8-G learning adaptation, V8-H strategy evolution, planning, and V8-B execution preparation. */
export class ObjectiveDrivenExecutiveCycle {
    private readonly objectiveEngine: ExecutiveObjectiveEngine;
    private readonly intentBridge = new ExecutiveObjectiveIntentBridge();
    private readonly interventionEngine = new ExecutiveObjectiveInterventionEngine();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;
    private readonly arbitrator: ExecutiveWorkArbitrator;
    private readonly capacityGate?: ExecutiveCapacityGate;
    private readonly resourceRequirements: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveCapacityRequirement[];
    private readonly resourceBudget?: ExecutiveResourceBudget;
    private readonly budgetRequirements: (candidate: ExecutiveWorkCandidate) => readonly ExecutiveBudgetRequirement[];
    private readonly tradeoffEngine?: ExecutiveTradeoffEngine;
    private readonly tradeoffInputs: (candidate: ExecutiveWorkCandidate) => ExecutiveTradeoffCandidate;
    private readonly learningAdaptation?: ExecutiveLearningAdaptationEngine;
    private readonly strategyEvolution: ExecutiveStrategyEvolutionEngine;
    private readonly urgencyScorer = new ExecutiveObjectiveUrgencyScorer();
    private readonly progressTrendScorer = new ExecutiveObjectiveProgressTrendScorer();
    private readonly learningEngine: ExecutiveLearningEngine;
    private readonly strategyEngine = new MemoryAwareStrategyEngine();
    private readonly adaptivePolicy = new ExecutiveAdaptiveInterventionPolicy();

    constructor(objectiveStore: ExecutiveObjectiveStore, capabilityResolver: CapabilityResolver, memoryStore: ExecutiveMemoryStore = new InMemoryExecutiveMemoryStore(), options: ObjectiveDrivenExecutiveCycleOptions = {}) {
        this.objectiveEngine = new ExecutiveObjectiveEngine(objectiveStore);
        this.planBuilder = new ExecutiveIntentPlanBuilder(capabilityResolver);
        this.arbitrator = new ExecutiveWorkArbitrator({ maxSelections: options.maxSelections ?? 1 });
        this.capacityGate = options.capacityGate;
        this.resourceRequirements = options.resourceRequirements ?? (() => []);
        this.resourceBudget = options.resourceBudget;
        this.budgetRequirements = options.budgetRequirements ?? (() => []);
        this.tradeoffEngine = options.tradeoffEngine;
        this.tradeoffInputs = options.tradeoffInputs ?? ((candidate) => ({ id: candidate.objective.id, objectiveValue: Math.max(0, candidate.assessment.attentionRequired ? 60 : 20), urgency: candidate.urgency.score, strategicImpact: candidate.progressTrend.interventionScore, resourceCost: 0, risk: 0 }));
        this.learningAdaptation = options.learningAdaptation;
        this.strategyEvolution = options.strategyEvolution ?? new ExecutiveStrategyEvolutionEngine(objectiveStore);
        this.learningEngine = new ExecutiveLearningEngine(memoryStore);
    }

    async run(state: ExecutiveState, capabilities: IntentPlanCapabilityMap, now = new Date()): Promise<readonly ObjectiveDrivenCycleResult[]> {
        const objectives = await this.objectiveEngine.listActive();
        const learning = await this.learningEngine.learn();
        const strategyEvolution = await this.strategyEvolution.evolve(objectives, learning);
        const candidates: ExecutiveWorkCandidate[] = [];
        for (const objective of objectives) {
            const assessment = await this.objectiveEngine.assess(objective, state);
            candidates.push({ objective, assessment, urgency: this.urgencyScorer.score({ objective, assessment, now }), progressTrend: this.progressTrendScorer.score(objective) });
        }
        const arbitration: ExecutiveWorkArbitrationDecision = this.arbitrator.arbitrate(candidates);
        const capacity = this.capacityGate?.admit(arbitration.selected, this.resourceRequirements);
        const capacitySelected = capacity?.selected ?? arbitration.selected;
        const budgetCandidates: ExecutiveBudgetCandidate[] = capacitySelected.map((candidate) => ({ id: candidate.objective.id, priorityScore: candidate.urgency.score + candidate.progressTrend.interventionScore, requirements: this.budgetRequirements(candidate) }));
        const budget = this.resourceBudget?.allocate(budgetCandidates);
        const budgetAllowedIds = budget ? new Set(budget.allocations.filter((item) => item.decision === "ALLOCATE").map((item) => item.candidateId)) : undefined;
        const budgetSelected = budgetAllowedIds ? capacitySelected.filter((candidate) => budgetAllowedIds.has(candidate.objective.id)) : capacitySelected;
        const rawTradeoffCandidates = budgetSelected.map(this.tradeoffInputs);
        const learningAdaptation = this.learningAdaptation ? rawTradeoffCandidates.map((candidate) => this.learningAdaptation!.adapt(candidate, learning)) : undefined;
        const tradeoffCandidates = learningAdaptation?.map((decision) => decision.adjustedCandidate) ?? rawTradeoffCandidates;
        const tradeoff = this.tradeoffEngine?.evaluate(tradeoffCandidates);
        const tradeoffAllowedIds = tradeoff ? new Set(tradeoff.allocations.filter((item) => item.decision === "SELECT").map((item) => item.candidateId)) : undefined;
        const selected = tradeoffAllowedIds ? budgetSelected.filter((candidate) => tradeoffAllowedIds.has(candidate.objective.id)) : budgetSelected;
        const results: ObjectiveDrivenCycleResult[] = [];
        for (const { objective, assessment, urgency, progressTrend } of selected) {
            const intervention = this.interventionEngine.assess({ objective, assessment, progressTrend });
            const strategicObjective = { objectiveId: objective.id, title: objective.title, priority: objective.priority, horizon: "MEDIUM_TERM" as const, strategicScore: urgency.score + progressTrend.interventionScore, dependencyIds: [], conflictIds: [] };
            const strategy = this.strategyEngine.evaluate({ objective: strategicObjective, learning });
            const adaptiveIntervention = this.adaptivePolicy.evaluate({ intervention, strategy });
            const adaptedIntervention: ObjectiveIntervention = { ...intervention, reason: adaptiveIntervention.reason, evidence: adaptiveIntervention.evidence };
            const actionableIntervention = intervention.type !== "NO_INTERVENTION" && intervention.interventionRequired;
            const bridgedIntent = this.intentBridge.build({ objective, assessment, intervention: actionableIntervention ? adaptedIntervention : adaptiveIntervention.mode === "CONTINUE" ? undefined : adaptedIntervention });
            const intent: ExecutiveIntent = actionableIntervention ? { ...bridgedIntent, type: intervention.type === "RECOVER_FAILED_WORK" ? "RECOVER_FAILED_WORK" : "INTERVENE_OBJECTIVE" } : bridgedIntent;
            if (!actionableIntervention) {
                results.push({ objective, assessment, urgency, progressTrend, intervention, learning, strategyEvolution, strategy, adaptiveIntervention, intent, capacity, budget, tradeoff, learningAdaptation });
                continue;
            }
            const plan = this.planBuilder.build({ intent, capabilities });
            results.push({ objective, assessment, urgency, progressTrend, intervention, learning, strategyEvolution, strategy, adaptiveIntervention, intent, plan, capacity, budget, tradeoff, learningAdaptation });
        }
        return results;
    }
}
