import type { CapabilityResolver } from "../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import { ExecutiveIntentPlanBuilder } from "../planning/intent-plan-builder.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import { ExecutiveObjectiveEngine, type ExecutiveObjectiveRecord, type ExecutiveObjectiveStore, type ObjectiveAssessment } from "./objective-engine.js";
import { ExecutiveObjectiveIntentBridge } from "./objective-intent-bridge.js";
import { ExecutiveObjectivePrioritySelector } from "./objective-priority-selector.js";
import { ExecutiveObjectiveProgressTrendScorer, type ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import { ExecutiveObjectiveUrgencyScorer, type ObjectiveUrgencyScore } from "./objective-urgency.js";
import type { ExecutiveState } from "./executive-state.js";

export interface ObjectiveDrivenCycleResult {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly urgency: ObjectiveUrgencyScore;
    readonly progressTrend: ObjectiveProgressTrendScore;
    readonly intent: ExecutiveIntent;
    readonly plan?: ExecutionPlan;
}

/** Connects objective assessment, urgency, progress trend, selection, intent, and planning. */
export class ObjectiveDrivenExecutiveCycle {
    private readonly objectiveEngine: ExecutiveObjectiveEngine;
    private readonly intentBridge = new ExecutiveObjectiveIntentBridge();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;
    private readonly selector = new ExecutiveObjectivePrioritySelector();
    private readonly urgencyScorer = new ExecutiveObjectiveUrgencyScorer();
    private readonly progressTrendScorer = new ExecutiveObjectiveProgressTrendScorer();

    constructor(
        objectiveStore: ExecutiveObjectiveStore,
        capabilityResolver: CapabilityResolver,
    ) {
        this.objectiveEngine = new ExecutiveObjectiveEngine(objectiveStore);
        this.planBuilder = new ExecutiveIntentPlanBuilder(capabilityResolver);
    }

    async run(
        state: ExecutiveState,
        capabilities: IntentPlanCapabilityMap,
        now = new Date(),
    ): Promise<readonly ObjectiveDrivenCycleResult[]> {
        const objectives = await this.objectiveEngine.listActive();
        const candidates = [] as Array<{
            objective: ExecutiveObjectiveRecord;
            assessment: ObjectiveAssessment;
            urgency: ObjectiveUrgencyScore;
            progressTrend: ObjectiveProgressTrendScore;
        }>;

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
            const intent = this.intentBridge.build({ objective, assessment });

            if (intent.type === "NO_ACTION" || intent.type === "WAIT_FOR_FOUNDER_DECISION" || intent.type === "MONITOR_ACTIVE_WORK") {
                results.push({ objective, assessment, urgency, progressTrend, intent });
                continue;
            }

            const plan = this.planBuilder.build({ intent, capabilities });
            results.push({ objective, assessment, urgency, progressTrend, intent, plan });
        }

        return results;
    }
}
