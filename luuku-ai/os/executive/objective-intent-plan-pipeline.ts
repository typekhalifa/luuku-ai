import type { ExecutiveState } from "./executive-state.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import type { ExecutiveObjectiveRecord, ObjectiveAssessment, ExecutiveObjectiveEngine } from "./objective-engine.js";
import { ExecutiveObjectiveIntentBridge } from "./objective-intent-bridge.js";
import { ExecutiveIntentPlanBuilder, type IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";

export interface ObjectiveIntentPlanResult {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly intent: ExecutiveIntent;
    readonly plan?: ExecutionPlan;
}

/**
 * Connects the executive objective layer to the existing intent and planning layers.
 * This pipeline assesses an objective, converts the assessment to intent, and only
 * creates a plan when the resulting intent is actionable. It never executes work.
 */
export class ExecutiveObjectiveIntentPlanPipeline {
    private readonly bridge = new ExecutiveObjectiveIntentBridge();

    constructor(
        private readonly objectiveEngine: ExecutiveObjectiveEngine,
        private readonly planBuilder: ExecutiveIntentPlanBuilder,
    ) {}

    async build(
        objective: ExecutiveObjectiveRecord,
        state: ExecutiveState,
        capabilities: IntentPlanCapabilityMap,
    ): Promise<ObjectiveIntentPlanResult> {
        const assessment = await this.objectiveEngine.assess(objective, state);
        const intent = this.bridge.build({ objective, assessment });

        if (intent.type === "NO_ACTION") {
            return { objective, assessment, intent };
        }

        const plan = this.planBuilder.build({ intent, capabilities });
        return { objective, assessment, intent, plan };
    }
}
