import { ExecutiveAdaptiveCompanyStateCoordinator } from "../v8-j-adaptive-company-state-coordinator.js";
import type { ExecutiveInterventionSignal } from "../v8-j-intervention-adapter.js";
import type { ObjectiveDrivenCycleResult } from "../objective-driven-executive-cycle.js";

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

const objectiveResult = {
    objective: { id: "objective:revenue", title: "Increase revenue", priority: "HIGH" },
    intervention: {
        objectiveId: "objective:revenue",
        type: "INVESTIGATE_STAGNATION",
        interventionRequired: true,
        reason: "Revenue progress has stalled.",
        evidence: { progressTrend: "STAGNANT" },
    },
    strategy: {
        objectiveId: "objective:revenue",
        actionRisk: "MEDIUM",
        adaptation: "CHANGE_APPROACH",
        relevantPatterns: ["REPEATED_FAILURE"],
        reason: "Repeated failure evidence supports changing the approach.",
    },
} as ObjectiveDrivenCycleResult;

const coordinator = new ExecutiveAdaptiveCompanyStateCoordinator();

const matched = await coordinator.coordinate(
    [signal],
    [objectiveResult],
    {
        resolveObjective: (item) => item.id === signal.id
            ? { objectiveId: "objective:revenue", reason: "Explicitly associated with the revenue objective." }
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
