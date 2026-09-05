import type { CapabilityResolver } from "../planning/capability-resolver.js";
import type { IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import { ExecutiveIntentPlanBuilder } from "../planning/intent-plan-builder.js";
import type { ExecutionPlan } from "../planning/execution-plan.js";
import type { ExecutiveIntent } from "./executive-intent.js";
import { ExecutiveObjectiveEngine, type ExecutiveObjectiveRecord, type ExecutiveObjectiveStore, type ObjectiveAssessment } from "./objective-engine.js";
import { ExecutiveObjectiveIntentBridge } from "./objective-intent-bridge.js";
import type { ExecutiveState } from "./executive-state.js";

export interface ObjectiveDrivenCycleResult {
    readonly objective: ExecutiveObjectiveRecord;
    readonly assessment: ObjectiveAssessment;
    readonly intent: ExecutiveIntent;
    readonly plan?: ExecutionPlan;
}

/**
 * Connects the durable objective layer to the existing intent/plan boundary.
 * This layer does not approve, submit, enqueue, or execute work.
 */
export class ObjectiveDrivenExecutiveCycle {
    private readonly objectiveEngine: ExecutiveObjectiveEngine;
    private readonly intentBridge = new ExecutiveObjectiveIntentBridge();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;

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
    ): Promise<readonly ObjectiveDrivenCycleResult[]> {
        const objectives = await this.objectiveEngine.listActive();
        const results: ObjectiveDrivenCycleResult[] = [];

        for (const objective of objectives) {
            const assessment = await this.objectiveEngine.assess(objective, state);
            const intent = this.intentBridge.build({ objective, assessment });

            if (intent.type === "NO_ACTION" || intent.type === "WAIT_FOR_FOUNDER_DECISION" || intent.type === "MONITOR_ACTIVE_WORK") {
                results.push({ objective, assessment, intent });
                continue;
            }

            const plan = this.planBuilder.build({ intent, capabilities });
            results.push({ objective, assessment, intent, plan });
        }

        return results;
    }
}
