import {
    buildExecutiveDecisionTrace,
    InMemoryExecutiveDecisionTraceStore,
} from "../executive-decision-trace.js";
import { ExecutiveEvaluationFramework } from "../executive-evaluation.js";
import type { ExecutiveIntent } from "../executive-intent.js";
import type { ExecutiveObservation } from "../executive-observation.js";
import type { ExecutionPlan } from "../../planning/execution-plan.js";
import type { AutonomyPolicyResult } from "../autonomy-policy.js";
import type { ExecutionDecision } from "../execution-decision.js";

async function main(): Promise<void> {
    const startedAt = new Date("2026-09-05T12:00:00.000Z");
    const completedAt = new Date("2026-09-05T12:00:00.100Z");

    const observation: ExecutiveObservation = {
        id: "failed-work",
        type: "FAILED_WORK",
        severity: "CRITICAL",
        message: "1 work item has failed.",
        evidence: { failed: 1, failedWorkIds: ["workflow-provider-sync"] },
    };

    const intent: ExecutiveIntent = {
        id: "intervene-provider-sync",
        type: "INTERVENE_OBJECTIVE",
        objective: "Recover the provider synchronization objective.",
        reason: "The objective is regressing and historical failures indicate the current approach should change.",
        sourceObservationIds: [observation.id],
        evidence: {
            objectiveId: "objective-provider-sync",
            intervention: "RECOVER_REGRESSION",
            learnedPattern: "CHANGE_APPROACH",
        },
    };

    const plan: ExecutionPlan = {
        id: "execution-provider-sync-recovery",
        goal: "Recover the provider synchronization objective.",
        sourcePlanId: "execution-intent-plan-objective-provider-sync",
        steps: [{
            taskId: "recover-provider-sync",
            agentId: "recovery-agent",
            capability: "provider-recovery",
            dependsOn: [],
            input: { objectiveId: "objective-provider-sync" },
        }],
        requiresFounderApproval: false,
        createdAt: startedAt,
        metadata: { source: "executive" },
    };

    const policy: AutonomyPolicyResult = {
        decision: "AUTONOMOUS",
        reason: "Provider recovery is approved for autonomous execution.",
        requiresFounderApproval: false,
        evidence: { capability: "provider-recovery" },
    };

    const decision: ExecutionDecision = {
        id: "execution-decision-intervene-provider-sync",
        status: "ELIGIBLE",
        intentId: intent.id,
        planId: plan.id,
        reason: "The plan is eligible for autonomous execution.",
        requiresFounderApproval: false,
        evidence: { policy: "AUTONOMOUS" },
        createdAt: startedAt,
    };

    const traceStore = new InMemoryExecutiveDecisionTraceStore();
    const trace = buildExecutiveDecisionTrace({
        traceId: "trace-provider-sync-evaluation",
        intent,
        observation,
        plan,
        policy,
        decision,
        submission: { status: "SUBMITTED", workflowId: "workflow-provider-sync-recovery" },
        continuation: { status: "SCHEDULED", queueItemId: "workflow-provider-sync-recovery:recover-provider-sync" },
        execution: { status: "COMPLETED", evidence: { executionAuthority: "V6 runtime" } },
        outcome: { status: "COMPLETED", success: true, evidence: { workflowId: "workflow-provider-sync-recovery" } },
        memory: { recorded: true, memoryId: "executive-memory:workflow-provider-sync-recovery:outcome" },
        startedAt,
        completedAt,
    });

    await traceStore.save(trace);
    const stored = (await traceStore.list())[0];
    const evaluation = new ExecutiveEvaluationFramework().evaluate(stored);

    const assert = (condition: boolean, message: string): void => {
        if (!condition) throw new Error(`Assertion failed: ${message}`);
        console.log(`✓ ${message}`);
    };

    assert(evaluation.status === "PASS", "complete lifecycle passes evaluation");
    assert(evaluation.score === 100, "evaluation score is 100");
    assert(evaluation.criteria.length === 8, "all eight executive dimensions are evaluated");
    assert(evaluation.criteria.every((criterion) => criterion.passed), "every evaluation criterion passes");
    assert(evaluation.summary === "8/8 evaluation criteria passed.", "evaluation summary is deterministic");
    assert(stored.events[7].evidence.executionAuthority === "V6 runtime", "execution authority remains observable");

    console.log(`Evaluation status   : ${evaluation.status}`);
    console.log(`Evaluation score    : ${evaluation.score}%`);
    console.log(`Criteria evaluated  : ${evaluation.criteria.length}`);
    console.log(`Evaluation summary  : ${evaluation.summary}`);
    console.log(`Framework status    : PASS`);
}

void main();
