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
import {
    ExecutiveObjectiveInterventionEngine,
    type ObjectiveIntervention,
} from "./objective-intervention.js";
import { ExecutiveObjectivePrioritySelector } from "./objective-priority-selector.js";
import {
    ExecutiveObjectiveProgressTrendScorer,
    type ObjectiveProgressTrendScore,
} from "./objective-progress-trend.js";
import {
    ExecutiveObjectiveUrgencyScorer,
    type ObjectiveUrgencyScore,
} from "./objective-urgency.js";
import type { ExecutiveState } from "./executive-state.js";
import {
    ExecutiveLearningEngine,
    InMemoryExecutiveMemoryStore,
    type ExecutiveLearningRecord,
    type ExecutiveMemoryStore,
} from "./executive-memory.js";
import {
    MemoryAwareStrategyEngine,
    type MemoryAwareStrategyDecision,
} from "./memory-aware-strategy.js";
import {
    ExecutiveAdaptiveInterventionPolicy,
    type AdaptiveInterventionDecision,
} from "./adaptive-intervention-policy.js";

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
}

export interface ObjectiveDrivenExecutiveCycleOptions {
    readonly maxSelections?: number;
}

/**
 * Connects objective assessment, urgency, progress trend, intervention,
 * historical learning, adaptive strategy, intent, and planning.
 * Execution remains below this boundary.
 */
export class ObjectiveDrivenExecutiveCycle {
    private readonly objectiveEngine: ExecutiveObjectiveEngine;
    private readonly intentBridge = new ExecutiveObjectiveIntentBridge();
    private readonly interventionEngine = new ExecutiveObjectiveInterventionEngine();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;
    private readonly selector: ExecutiveObjectivePrioritySelector;
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
        this.selector = new ExecutiveObjectivePrioritySelector({ maxSelections: options.maxSelections ?? 1 });
        this.learningEngine = new ExecutiveLearningEngine(memoryStore);
    }

    async run(
        state: ExecutiveState,
        capabilities: IntentPlanCapabilityMap,
        now = new Date(),
    ): Promise<readonly ObjectiveDrivenCycleResult[]> {
        const objectives = await this.objectiveEngine.listActive();
        const learning = await this.learningEngine.learn();
        const candidates: Array<{
            objective: ExecutiveObjectiveRecord;
            assessment: ObjectiveAssessment;
            urgency: ObjectiveUrgencyScore;
            progressTrend: ObjectiveProgressTrendScore;
        }> = [];

        for (const objective of objectives) {
            const assessment = await this.objectiveEngine.assess(objective, state);
            candidates.push({
                objective,
                assessment,
                urgency: this.urgencyScorer.score({ objective, assessment, now }),
                progressTrend: this.progressTrendScorer.score(objective),
            });
        }

        const selected = this.selector.select(candidates);
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
            const strategy = this.strategyEngine.evaluate({
                objective: strategicObjective,
                learning,
            });
            const adaptiveIntervention = this.adaptivePolicy.evaluate({
                intervention,
                strategy,
            });

            const adaptedIntervention: ObjectiveIntervention = {
                ...intervention,
                reason: adaptiveIntervention.reason,
                evidence: adaptiveIntervention.evidence,
            };

            const executableIntervention = intervention.type !== "NO_INTERVENTION"
                && intervention.interventionRequired;

            // The intent bridge preserves the semantic reason for the objective.
            // For executable interventions, normalize the intent type at this
            // boundary so the downstream planning/policy pipeline receives an
            // explicitly executable intent rather than MONITOR_ACTIVE_WORK.
            const bridgedIntent = this.intentBridge.build({
                objective,
                assessment,
                intervention: executableIntervention ? adaptedIntervention : (
                    adaptiveIntervention.mode === "CONTINUE" ? undefined : adaptedIntervention
                ),
            });

            const intent: ExecutiveIntent = executableIntervention
                ? {
                    ...bridgedIntent,
                    type: intervention.type === "RECOVER_FAILED_WORK"
                        ? "RECOVER_FAILED_WORK"
                        : "INTERVENE_OBJECTIVE",
                }
                : bridgedIntent;

            if (!executableIntervention) {
                results.push({
                    objective,
                    assessment,
                    urgency,
                    progressTrend,
                    intervention,
                    learning,
                    strategy,
                    adaptiveIntervention,
                    intent,
                });
                continue;
            }

            const plan = this.planBuilder.build({ intent, capabilities });
            results.push({
                objective,
                assessment,
                urgency,
                progressTrend,
                intervention,
                learning,
                strategy,
                adaptiveIntervention,
                intent,
                plan,
            });
        }

        return results;
    }
}
