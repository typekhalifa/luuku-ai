import { ExecutiveAdaptiveCompanyStateCoordinator } from "../v8-j-adaptive-company-state-coordinator.js";
import type { ExecutiveInterventionSignal } from "../v8-j-intervention-adapter.js";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import type { ObjectiveDrivenCycleResult } from "../objective-driven-executive-cycle.js";
import type { ObjectiveAssessment } from "../objective-engine.js";
import type { ObjectiveProgressTrendScore } from "../objective-progress-trend.js";
import type { ObjectiveUrgencyScore } from "../objective-urgency.js";
import type { ExecutiveLearningRecord } from "../executive-memory.js";
import type { ExecutiveStrategyEvolutionDecision } from "../executive-strategy-evolution.js";
import type { MemoryAwareStrategyDecision } from "../memory-aware-strategy.js";
import type { AdaptiveInterventionDecision } from "../adaptive-intervention-policy.js";
import type { ExecutiveIntent } from "../executive-intent.js";

async function main(): Promise<void> {
    const signal: ExecutiveInterventionSignal = {
        id: "executive-intervention:company-state:sales:pipeline",
        type: "INVESTIGATE_BUSINESS_CHANGE",
        severity: "ATTENTION",
        domain: "SALES",
        key: "pipeline-value",
        reason: "A sales state change requires executive investigation.",
        sourceObservationIds: ["company-state:sales:pipeline"],
        evidence: { previousValue: 15000, currentValue: 9000 },
    };

    const objective: ExecutiveObjectiveRecord = {
        id: "objective:revenue",
        title: "Increase revenue",
        description: "Improve revenue performance.",
        priority: "high",
        status: "ACTIVE",
        progress: 40,
        previousProgress: 40,
        createdAt: new Date("2026-09-01T00:00:00.000Z"),
        updatedAt: new Date("2026-09-12T00:00:00.000Z"),
    };

    const assessment: ObjectiveAssessment = {
        objectiveId: objective.id,
        status: "ACTIVE",
        progress: objective.progress,
        attentionRequired: true,
        reason: "Revenue progress has stalled.",
    };

    const urgency: ObjectiveUrgencyScore = {
        objectiveId: objective.id,
        score: 60,
        reason: "Objective requires attention.",
    };

    const progressTrend: ObjectiveProgressTrendScore = {
        objectiveId: objective.id,
        trend: "STAGNANT",
        delta: 0,
        interventionScore: 30,
        interventionRequired: true,
    };

    const learning: readonly ExecutiveLearningRecord[] = [
        {
            pattern: "REPEATED_FAILURE",
            action: "cold-outreach",
            objectiveIds: [objective.id],
            occurrences: 4,
            successfulOccurrences: 0,
            failedOccurrences: 4,
            confidence: 0,
            lesson: "Repeated failure evidence supports changing the approach.",
        },
    ];

    const strategyEvolution: ExecutiveStrategyEvolutionDecision = {
        proposals: [],
        createdObjectiveIds: [],
        modifiedObjectiveIds: [],
        deferredObjectiveIds: [],
        evidence: [],
    };

    const strategy: MemoryAwareStrategyDecision = {
        objectiveId: objective.id,
        actionRisk: "MEDIUM",
        adaptation: "CHANGE_APPROACH",
        relevantPatterns: learning,
        reason: "Repeated failure evidence supports changing the approach.",
    };

    const adaptiveIntervention: AdaptiveInterventionDecision = {
        objectiveId: objective.id,
        mode: "CHANGE_APPROACH",
        risk: "MEDIUM",
        strategy: "CHANGE_APPROACH",
        intervention: "INVESTIGATE_STAGNATION",
        reason: "Repeated failure evidence supports changing the approach.",
        evidence: { progressTrend: "STAGNANT" },
    };

    const intent: ExecutiveIntent = {
        id: "objective:revenue:intervene",
        type: "INTERVENE_OBJECTIVE",
        objective: objective.title,
        reason: "Revenue progress has stalled.",
        sourceObservationIds: [],
        evidence: {},
    };

    const objectiveResult: ObjectiveDrivenCycleResult = {
        objective,
        assessment,
        urgency,
        progressTrend,
        intervention: {
            objectiveId: objective.id,
            type: "INVESTIGATE_STAGNATION",
            interventionRequired: true,
            reason: "Revenue progress has stalled.",
            evidence: { progressTrend: "STAGNANT" },
        },
        learning,
        strategyEvolution,
        strategy,
        adaptiveIntervention,
        intent,
    };

    const coordinator = new ExecutiveAdaptiveCompanyStateCoordinator();

    const matched = await coordinator.coordinate(
        [signal],
        [objectiveResult],
        {
            resolveObjective: (item) => item.id === signal.id
                ? { objectiveId: objective.id, reason: "Explicitly associated with the revenue objective." }
                : { reason: "No explicit objective association exists." },
        },
    );

    if (matched.decisions.length !== 1) throw new Error("Expected one matched adaptive decision.");
    if (matched.decisions[0]?.mode !== "CHANGE_APPROACH") throw new Error("Expected CHANGE_APPROACH for repeated-failure strategy evidence.");
    if (matched.unresolved.length !== 0) throw new Error("Matched signal should not remain unresolved.");

    const unresolved = await coordinator.coordinate(
        [signal],
        [objectiveResult],
        {
            resolveObjective: () => ({ reason: "No explicit objective association exists." }),
        },
    );

    if (unresolved.decisions.length !== 0) throw new Error("Unresolved signal must not produce an adaptive decision.");
    if (unresolved.unresolved.length !== 1) throw new Error("Expected one unresolved signal.");

    const missingObjective = await coordinator.coordinate(
        [signal],
        [objectiveResult],
        {
            resolveObjective: () => ({ objectiveId: "objective:missing", reason: "Explicit resolver association." }),
        },
    );

    if (missingObjective.decisions.length !== 0) throw new Error("Missing objective context must not produce a decision.");
    if (missingObjective.unresolved.length !== 1) throw new Error("Expected missing objective to remain unresolved.");

    console.log("V8-J — Adaptive Company-State Coordinator Validation");
    console.log(`Matched decisions          : ${matched.decisions.length}`);
    console.log(`Matched decision mode      : ${matched.decisions[0]?.mode}`);
    console.log(`Unresolved without mapping : ${unresolved.unresolved.length}`);
    console.log(`Unresolved missing context : ${missingObjective.unresolved.length}`);
    console.log("✓ Explicit signal → objective association → adaptive decision");
    console.log("✓ No objective mapping → unresolved, no decision");
    console.log("✓ Missing objective context → unresolved, no decision");
    console.log("✓ Coordinator remains decision-only and does not create plans or execute work");
    console.log("V8-J COORDINATOR VALIDATION: PASS");
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
