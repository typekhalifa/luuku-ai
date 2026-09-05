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
import { InMemoryExecutiveMemoryStore, type ExecutiveMemoryStore } from "./executive-memory.js";

export interface AutonomousExecutiveCycleOptions {
    readonly capabilities: IntentPlanCapabilityMap;
    readonly policyRules: readonly AutonomyPolicyRule[];
    readonly executeRuntime?: boolean;
    readonly workflowExecutor?: WorkflowStepExecutor;
    readonly objectiveStore?: ExecutiveObjectiveStore;
    readonly memoryStore?: ExecutiveMemoryStore;
    readonly shouldProcessIntent?: (intent: ExecutiveIntent) => boolean | Promise<boolean>;
    readonly maxObjectiveSelections?: number;
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
    private readonly memoryStore: ExecutiveMemoryStore;

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
        this.memoryStore = options.memoryStore ?? new InMemoryExecutiveMemoryStore();
        this.objectiveCycle = options.objectiveStore
            ? new ObjectiveDrivenExecutiveCycle(
                options.objectiveStore,
                capabilityResolver,
                this.memoryStore,
                { maxSelections: options.maxObjectiveSelections ?? 1 },
            )
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
            .filter((intent) =>
                (intent.type === "RECOVER_FAILED_WORK" || intent.type === "INTERVENE_OBJECTIVE")
                && objectiveResults.some((result) => result.intent.id === intent.id && result.plan),
            );
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
            if (options.shouldProcessIntent && !(await options.shouldProcessIntent(intent))) continue;
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

            intentResults.push({ intent, planId: plan.id, policy, decision, submission, continuation });
        }

        const executableWorkflowIds = [...new Set(
            intentResults
                .map((result) => result.submission?.workflow?.id)
                .filter((id): id is string => id !== undefined),
        )];

        let runtimeResult: AutonomousRuntimeCycleResult | undefined;
        if (options.executeRuntime && executableWorkflowIds.length > 0) {
            runtimeResult = {
                scheduled: [],
                recovered: [],
                claimed: [],
                executed: [],
                completed: [],
                retried: [],
                failed: [],
                blocked: [],
                reconciled: [],
                escalated: [],
            };

            for (const workflowId of executableWorkflowIds) {
                const result = await this.runtime.runPersistedCycle(workflowId, now);
                runtimeResult = {
                    scheduled: [...runtimeResult.scheduled, ...result.scheduled],
                    recovered: [...runtimeResult.recovered, ...result.recovered],
                    claimed: [...runtimeResult.claimed, ...result.claimed],
                    executed: [...runtimeResult.executed, ...result.executed],
                    completed: [...runtimeResult.completed, ...result.completed],
                    retried: [...runtimeResult.retried, ...result.retried],
                    failed: [...runtimeResult.failed, ...result.failed],
                    blocked: [...runtimeResult.blocked, ...result.blocked],
                    reconciled: [...runtimeResult.reconciled, ...result.reconciled],
                    escalated: [...runtimeResult.escalated, ...result.escalated],
                };
            }

            await this.recordRuntimeOutcome(runtimeResult, intentResults, objectiveResults, now);
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

    private async recordRuntimeOutcome(
        runtime: AutonomousRuntimeCycleResult,
        intentResults: readonly AutonomousExecutiveIntentResult[],
        objectiveResults: readonly ObjectiveDrivenCycleResult[],
        now: Date,
    ): Promise<void> {
        const terminalQueueIds = new Set([
            ...runtime.completed,
            ...runtime.failed,
            ...runtime.blocked,
            ...runtime.reconciled,
            ...runtime.escalated,
        ]);

        for (const result of intentResults) {
            const workflow = result.submission?.workflow;
            if (!workflow) continue;

            const terminalStep = workflow.steps.find((step) => terminalQueueIds.has(`${workflow.id}:${step.id}`));
            if (!terminalStep) continue;

            const workflowId = workflow.id;
            const success = runtime.completed.includes(`${workflow.id}:${terminalStep.id}`);
            const objectiveResult = objectiveResults.find((item) => item.intent.id === result.intent.id);
            const outcome = success ? "Workflow completed." : "Workflow reached a non-success terminal outcome.";
            const id = `executive-memory:${workflowId}:outcome`;
            const existing = await this.memoryStore.list();
            if (existing.some((record) => record.id === id)) continue;

            await this.memoryStore.save({
                id,
                objectiveId: objectiveResult?.objective.id,
                workflowId,
                eventType: success ? "ACTION_COMPLETED" : "ACTION_FAILED",
                action: objectiveResult?.adaptiveIntervention.mode ?? result.intent.type,
                outcome,
                success,
                lesson: success
                    ? "The selected executive approach completed successfully."
                    : "The selected executive approach produced a non-success outcome and should be reconsidered.",
                createdAt: now,
            });
        }
    }
}
