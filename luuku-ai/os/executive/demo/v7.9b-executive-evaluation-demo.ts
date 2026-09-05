import { buildExecutiveDecisionTrace } from "../executive-decision-trace.js";
import { ExecutiveEvaluationFramework } from "../executive-evaluation.js";

const trace = buildExecutiveDecisionTrace({
    traceId: "v7.9b-demo-trace",
    intent: {
        id: "intervene-objective-demo",
        type: "INTERVENE_OBJECTIVE",
        objective: "Recover the regressing provider objective.",
        reason: "Historical failures indicate a change in approach is required.",
        sourceObservationIds: ["objective-regressing"],
        evidence: { objectiveId: "objective-provider-sync" },
    },
    observation: {
        id: "objective-regressing",
        type: "FAILED_WORK",
        severity: "CRITICAL",
        message: "Provider synchronization is regressing.",
        evidence: { progressTrend: "REGRESSING" },
    },
    plan: {
        id: "execution-v7.9b-demo",
        goal: "Recover provider synchronization.",
        sourcePlanId: "plan-v7.9b-demo",
        steps: [{
            taskId: "task-provider-sync",
            agentId: "recovery-agent",
            capability: "provider-sync-recovery",
            dependsOn: [],
            input: { strategy: "changed-approach" },
        }],
        requiresFounderApproval: false,
        createdAt: new Date(),
        metadata: { source: "v7.9b-demo" },
    },
    policy: {
        decision: "AUTONOMOUS",
        reason: "Recovery capability is approved for autonomous execution.",
        requiresFounderApproval: false,
        evidence: { capability: "provider-sync-recovery" },
    },
    decision: {
        id: "execution-decision-intervene-objective-demo",
        status: "ELIGIBLE",
        intentId: "intervene-objective-demo",
        planId: "execution-v7.9b-demo",
        reason: "Policy permits autonomous execution.",
        requiresFounderApproval: false,
        evidence: { authority: "V6 runtime" },
        createdAt: new Date(),
    },
    submission: { status: "SUBMITTED", workflowId: "workflow-v7.9b-demo" },
    continuation: { status: "SCHEDULED", queueItemId: "workflow-v7.9b-demo:task-provider-sync" },
    execution: { status: "COMPLETED", evidence: { authority: "V6 runtime" } },
    outcome: { status: "SUCCESS", success: true, evidence: { completed: true } },
    memory: { recorded: true, memoryId: "executive-memory:workflow-v7.9b-demo:outcome" },
});

const evaluation = new ExecutiveEvaluationFramework().evaluate(trace);

const assert = (condition: boolean, message: string): void => {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`✓ ${message}`);
};

assert(evaluation.status === "PASS", "complete lifecycle passes evaluation");
assert(evaluation.score === 100, "evaluation score is 100");
assert(evaluation.criteria.length === 8, "all eight executive dimensions are evaluated");
assert(evaluation.criteria.every((criterion) => criterion.passed), "every evaluation criterion passes");
assert(evaluation.summary === "8/8 evaluation criteria passed.", "evaluation summary is deterministic");
assert(trace.events.find((event) => event.stage === "DECISION")?.evidence.authority === "V6 runtime", "execution authority remains observable");

console.log(`Evaluation status   : ${evaluation.status}`);
console.log(`Evaluation score    : ${evaluation.score}%`);
console.log(`Criteria evaluated  : ${evaluation.criteria.length}`);
console.log(`Evaluation summary  : ${evaluation.summary}`);
console.log("Framework status    : PASS");
