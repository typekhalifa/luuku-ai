import type { QueueStore } from "../../orchestration/queue/queue.js";
import { AutonomousRuntime, type AutonomousRuntimeCycleResult } from "../../orchestration/workflow/autonomous-runtime.js";
import type { WorkflowStore } from "../../orchestration/workflow/workflow-store.js";
import { SharedAgentWorkflowExecutor } from "../../orchestration/workflow/shared-agent-workflow-executor.js";
import { WorkflowOrchestrator, type WorkflowStepExecutor } from "../../orchestration/workflow/workflow-orchestrator.js";
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
import { ObjectiveDrivenExecutiveCycle, type ObjectiveDrivenCycleResult } from "./objective-driven-executive-cycle.js";
import type { ExecutiveObjectiveStore } from "./objective-engine.js";
import type { ExecutiveState } from "./executive-state.js";

export interface AutonomousExecutiveCycleOptions {
    readonly capabilities: IntentPlanCapabilityMap;
    readonly policyRules: readonly AutonomyPolicyRule[];
    readonly executeRuntime?: boolean;
    readonly workflowExecutor?: WorkflowStepExecutor;
    readonly objectiveStore?: ExecutiveObjectiveStore;
    /** Optional loop checkpoint hook used to suppress already-processed intents. */
    readonly shouldProcessIntent?: (intent: ExecutiveIntent) => boolean | Promise<boolean>;
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
    readonly objectiveResults: readonly ObjectiveDrivenCycleResult[];
    readonly intentResults: readonly AutonomousExecutiveIntentResult[];
    readonly runtime?: AutonomousRuntimeCycleResult;
    readonly feedback: ExecutionFeedbackSnapshot;
    readonly finalState: ExecutiveState;
    readonly finalObservation: ExecutiveObservationSnapshot;
}

/**
 * Composes the executive control loop into one autonomous cycle.
 * The executive decides and submits work; V6 remains the execution authority.
 * When an objective store is configured, objective-derived intents are the
 * preferred source for matching autonomous work so the same intent is not
 * submitted twice through observation and objective paths.
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
    private readonly objectiveCycle?: ObjectiveDrivenExecutiveCycle;

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
            new WorkflowOrchestrator(undefined, options.workflowExecutor ?? new SharedAgentWorkflowExecutor()),
            workflowStore,
        );
        this.objectiveCycle = options.objectiveStore
            ? new ObjectiveDrivenExecutiveCycle(options.objectiveStore, capabilityResolver)
            : undefined;
    }

    async run(
        options: AutonomousExecutiveCycleOptions,
        now = new Date(),
    ): Promise<AutonomousExecutiveCycleResult> {
        const initialState = await this.stateSource.snapshot();
        const initialFeedback = await this.feedbackSource.snapshot();
        const stateWithFeedback = this.feedbackProjector.apply(initialState, initialFeedback);
        const initialObservation = this.observer.observe(stateWithFeedback);
        const observedIntents = this.intentProjector.derive(initialObservation);
        const objectiveResults = this.objectiveCycle
            ? await this.objectiveCycle.run(stateWithFeedback, options.capabilities)
            : [];

        const objectiveIntents = objectiveResults
            .map((result) => result.intent)
            .filter((intent) => intent.type === "RECOVER_FAILED_WORK" && objectiveResults.some((result) => result.intent.id === intent.id && result.plan));
        const objectiveIntentTypes = new Set(objectiveIntents.map((intent) => intent.type));
        const intents: ExecutiveIntentSnapshot = {
            ...observedIntents,
            intents: [
                ...objectiveIntents,
                ...observedIntents.intents.filter((intent) => !objectiveIntentTypes.has(intent.type)),
            ],
        };
        const intentResults: AutonomousExecutiveIntentResult[] = [];

        for (const intent of intents.intents) {
            if (options.shouldProcessIntent && !(await options.shouldProcessIntent(intent))) {
                continue;
            }

            if (intent.type === "NO_ACTION" || intent.type === "WAIT_FOR_FOUNDER_DECISION" || intent.type === "MONITOR_ACTIVE_WORK") {
                intentResults.push({ intent });
                continue;
            }

            const objectivePlan = objectiveResults.find((result) => result.intent.id === intent.id)?.plan;
            const plan = objectivePlan ?? this.planBuilder.build({ intent, capabilities: options.capabilities });
            const policy = this.policy.evaluate({ intent, plan });
            const decision = this.decisionProjector.decide(intent, plan, policy);
            const submission = await this.submission.submit(decision, plan);
            const continuation = submission.status === "SUBMITTED" || submission.status === "ALREADY_SUBMITTED"
                ? await this.continuation.continue(plan.id, now)
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
            objectiveResults,
            intentResults,
            runtime: runtimeResult,
            feedback,
            finalState,
            finalObservation,
        };
    }
}
