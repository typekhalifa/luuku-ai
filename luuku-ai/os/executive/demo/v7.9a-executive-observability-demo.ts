import {
    buildExecutiveDecisionTrace,
    InMemoryExecutiveDecisionTraceStore,
} from "../executive-decision-trace.js";
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

    const store = new InMemoryExecutiveDecisionTraceStore();
    const trace = buildExecutiveDecisionTrace({
        traceId: "trace-provider-sync-recovery",
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

    await store.save(trace);
    const traces = await store.list();
    const stored = traces[0];
    const stages = stored.events.map((event) => event.stage);
    const expected = [
        "OBSERVATION",
        "INTENT",
        "PLAN",
        "POLICY",
        "DECISION",
        "SUBMISSION",
        "CONTINUATION",
        "EXECUTION",
        "OUTCOME",
        "MEMORY",
    ];

    const assert = (condition: boolean, message: string): void => {
        if (!condition) throw new Error(`Assertion failed: ${message}`);
        console.log(`✓ ${message}`);
    };

    assert(traces.length === 1, "one decision trace persisted");
    assert(JSON.stringify(stages) === JSON.stringify(expected), "full executive lifecycle is traceable");
    assert(stored.events[4].stage === "DECISION" && stored.events[4].evidence.status === "ELIGIBLE", "decision eligibility is observable");
    assert(stored.events[7].evidence.executionAuthority === "V6 runtime", "V6 remains the execution authority");
    assert(stored.events[8].evidence.success === true, "execution outcome is observable");
    assert(stored.events[9].evidence.recorded === true, "memory recording is observable");
    assert(stored.events.every((event, index) => index === 0 || event.timestamp > stored.events[index - 1].timestamp), "trace events are strictly ordered");

    console.log(`Trace events        : ${stored.events.length}`);
    console.log(`Trace lifecycle     : ${stages.join(" -> ")}`);
    console.log(`Decision status     : ${String(stored.events[4].evidence.status)}`);
    console.log(`Execution authority : ${String(stored.events[7].evidence.executionAuthority)}`);
    console.log(`Outcome             : ${String(stored.events[8].evidence.status)}`);
    console.log(`Observability       : PASS`);
}

void main();
