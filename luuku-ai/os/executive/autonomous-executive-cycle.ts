import type { QueueStore } from "../../orchestration/queue/queue.js";
import { AutonomousRuntime, type AutonomousRuntimeCycleResult } from "../../orchestration/workflow/autonomous-runtime.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import { SharedAgentWorkflowExecutor } from "../../orchestration/workflow/shared-agent-workflow-executor.js";
import { WorkflowOrchestrator } from "../../orchestration/workflow/workflow-orchestrator.js";
import { QueueScheduler } from "../../orchestration/scheduler/scheduler.js";
import type { CapabilityResolver } from "../planning/capability-resolver.js";
import { ExecutiveIntentPlanBuilder, type IntentPlanCapabilityMap } from "../planning/intent-plan-builder.js";
import { ExecutiveAutonomyPolicy, type AutonomyPolicyRule, type AutonomyPolicyResult } from "./autonomy-policy.js";
import { ExecutionDecisionProjector, type ExecutionDecision } from "./execution-decision.js";
import { DurableExecutionFeedbackSource, ExecutionFeedbackStateProjector, type ExecutionFeedbackSnapshot } from "./execution-feedback.js";
import { ExecutiveIntentProjector, type ExecutiveIntent, type ExecutiveIntentSnapshot } from "./executive-intent.js";
import { ExecutiveObservationLoop, type ExecutiveObservationSnapshot } from "./executive-observation.js";
import { DurableExecutiveStateSource } from "../control/durable-executive-state.js";
import { DurableExecutiveSubmission, type ExecutiveSubmissionResult } from "./executive-submission.js";
import { ExecutiveRuntimeContinuation, type RuntimeContinuationResult } from "./runtime-continuation.js";
import type { ExecutiveState } from "./executive-state.js";

export interface AutonomousExecutiveCycleOptions {
    readonly capabilities: IntentPlanCapabilityMap;
    readonly policyRules: readonly AutonomyPolicyRule[];
    readonly executeRuntime?: boolean;
}

export interface AutonomousExecutiveIntentResult {
    readonly intent: ExecutiveIntent;
    readonly planId?: string;
    readonly policy?: AutonomyPolicyResult;
    readonly decision?: ExecutionDecision;
    readonly submission?: ExecutiveSubmissionResult;
    readonly continuation?: RuntimeContinuationResult;
}

export interface AutonomousExecutiveCycleResult {
    readonly initialState: ExecutiveState;
    readonly initialObservation: ExecutiveObservationSnapshot;
    readonly intents: ExecutiveIntentSnapshot;
    readonly intentResults: readonly AutonomousExecutiveIntentResult[];
    readonly runtime?: AutonomousRuntimeCycleResult;
    readonly feedback: ExecutionFeedbackSnapshot;
    readonly finalState: ExecutiveState;
    readonly finalObservation: ExecutiveObservationSnapshot;
}

/**
 * Composes the executive control loop into one autonomous cycle.
 * The executive decides and submits work; V6 remains the execution authority.
 */
export class AutonomousExecutiveCycle {
    private readonly stateSource: DurableExecutiveStateSource;
    private readonly feedbackSource: DurableExecutionFeedbackSource;
    private readonly feedbackProjector = new ExecutionFeedbackStateProjector();
    private readonly observer = new ExecutiveObservationLoop();
    private readonly intentProjector = new ExecutiveIntentProjector();
    private readonly decisionProjector = new ExecutionDecisionProjector();
    private readonly planBuilder: ExecutiveIntentPlanBuilder;
    private readonly policy: ExecutiveAutonomyPolicy;
    private readonly submission: DurableExecutiveSubmission;
    private readonly continuation: ExecutiveRuntimeContinuation;
    private readonly runtime: AutonomousRuntime;

    constructor(
        private readonly workflowStore: WorkflowStore,
        private readonly queueStore: QueueStore,
        capabilityResolver: CapabilityResolver,
        options: AutonomousExecutiveCycleOptions,
    ) {
        this.stateSource = new DurableExecutiveStateSource(workflowStore, queueStore);
        this.feedbackSource = new DurableExecutionFeedbackSource(workflowStore, queueStore);
        this.planBuilder = new ExecutiveIntentPlanBuilder(capabilityResolver);
        this.policy = new ExecutiveAutonomyPolicy(options.policyRules);
        this.submission = new DurableExecutiveSubmission(workflowStore);
        this.continuation = new ExecutiveRuntimeContinuation(workflowStore, queueStore);
        this.runtime = new AutonomousRuntime(
            new QueueScheduler(queueStore),
            queueStore,
            new WorkflowOrchestrator(undefined, new SharedAgentWorkflowExecutor()),
            workflowStore,
        );
    }

    async run(
        options: AutonomousExecutiveCycleOptions,
        now = new Date(),
    ): Promise<AutonomousExecutiveCycleResult> {
        const initialState = await this.stateSource.snapshot();
        const initialFeedback = await this.feedbackSource.snapshot();
        const stateWithFeedback = this.feedbackProjector.apply(initialState, initialFeedback);
        const initialObservation = this.observer.observe(stateWithFeedback);
        const intents = this.intentProjector.derive(initialObservation);
        const intentResults: AutonomousExecutiveIntentResult[] = [];

        for (const intent of intents.intents) {
            if (intent.type === "NO_ACTION" || intent.type === "WAIT_FOR_FOUNDER_DECISION" || intent.type === "MONITOR_ACTIVE_WORK") {
                intentResults.push({ intent });
                continue;
            }

            const plan = this.planBuilder.build({ intent, capabilities: options.capabilities });
            const policy = this.policy.evaluate({ intent, plan });
            const decision = this.decisionProjector.decide(intent, plan, policy);
            const submission = await this.submission.submit(decision, plan);
            const continuation = submission.status === "SUBMITTED" || submission.status === "ALREADY_SUBMITTED"
                ? await this.continuation.continue(plan.id)
                : undefined;

            intentResults.push({
                intent,
                planId: plan.id,
                policy,
                decision,
                submission,
                continuation,
            });
        }

        const executableWorkflowIds = intentResults
            .map((result) => result.submission?.workflow?.id)
            .filter((id): id is string => id !== undefined);

        let runtimeResult: AutonomousRuntimeCycleResult | undefined;
        if (options.executeRuntime && executableWorkflowIds.length > 0) {
            runtimeResult = await this.runtime.runPersistedCycle(executableWorkflowIds[0], now);
        }

        const feedback = await this.feedbackSource.snapshot();
        const finalState = this.feedbackProjector.apply(await this.stateSource.snapshot(), feedback);
        const finalObservation = this.observer.observe(finalState);

        return {
            initialState: stateWithFeedback,
            initialObservation,
            intents,
            intentResults,
            runtime: runtimeResult,
            feedback,
            finalState,
            finalObservation,
        };
    }
}
