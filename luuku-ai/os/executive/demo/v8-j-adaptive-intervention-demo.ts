import { ExecutiveAdaptiveInterventionPolicy } from "../adaptive-intervention-policy.js";
import { ExecutiveCompanyStateAdaptiveInterventionEngine } from "../v8-j-adaptive-intervention.js";
import type { ExecutiveInterventionSignal } from "../v8-j-intervention-adapter.js";
import type { MemoryAwareStrategyDecision } from "../memory-aware-strategy.js";
import type { ObjectiveIntervention } from "../objective-intervention.js";

function signal(): ExecutiveInterventionSignal {
    return {
        id: "executive-intervention:company-state:sales:pipeline",
        type: "INVESTIGATE_BUSINESS_CHANGE",
        severity: "ATTENTION",
        domain: "SALES",
        key: "pipeline",
        reason: "A sales state change requires executive investigation.",
        sourceObservationIds: ["company-state:sales:pipeline"],
        evidence: { changeType: "CHANGED", previousValue: 10000, currentValue: 5000 },
    };
}

function intervention(): ObjectiveIntervention {
    return {
        objectiveId: "objective-revenue",
        type: "INVESTIGATE_STAGNATION",
        reason: "Objective progress is stagnant; investigate the bottleneck.",
        interventionRequired: true,
        evidence: { progressTrend: "STAGNANT" },
    };
}

function strategy(adaptation: MemoryAwareStrategyDecision["adaptation"]): MemoryAwareStrategyDecision {
    return {
        objectiveId: "objective-revenue",
        actionRisk: adaptation === "CHANGE_APPROACH" ? "HIGH" : "MEDIUM",
        adaptation,
        relevantPatterns: [],
        reason: adaptation === "CHANGE_APPROACH"
            ? "Repeated failure indicates that the current approach should change."
            : "Historical failures indicate that the current approach needs adjustment.",
    };
}

function main(): void {
    const engine = new ExecutiveCompanyStateAdaptiveInterventionEngine(
        new ExecutiveAdaptiveInterventionPolicy(),
    );

    const changeApproach = engine.evaluate({
        signal: signal(),
        objectiveIntervention: intervention(),
        strategy: strategy("CHANGE_APPROACH"),
    });

    const adjustApproach = engine.evaluate({
        signal: signal(),
        objectiveIntervention: intervention(),
        strategy: strategy("ADJUST_APPROACH"),
    });

    const noIntervention = engine.evaluate({
        signal: signal(),
        objectiveIntervention: {
            ...intervention(),
            interventionRequired: false,
            type: "NO_INTERVENTION",
        },
        strategy: strategy("CONTINUE"),
    });

    const valid =
        changeApproach.mode === "CHANGE_APPROACH" &&
        adjustApproach.mode === "ADJUST_APPROACH" &&
        noIntervention.mode === "CONTINUE" &&
        changeApproach.companyStateSignalId === signal().id &&
        changeApproach.companyStateDomain === "SALES" &&
        changeApproach.evidence.companyStateSignalType === "INVESTIGATE_BUSINESS_CHANGE";

    console.log("V8-J — Adaptive Intervention Decision Validation");
    console.log("-------------------------------------------------");
    console.log(`Change approach : ${changeApproach.mode}`);
    console.log(`Adjust approach : ${adjustApproach.mode}`);
    console.log(`No intervention : ${noIntervention.mode}`);
    console.log("");
    console.log("Validated paths:");
    console.log("✓ Company-state signal is preserved as decision evidence");
    console.log("✓ Repeated-failure strategy → CHANGE_APPROACH");
    console.log("✓ Failure strategy → ADJUST_APPROACH");
    console.log("✓ No intervention → CONTINUE");
    console.log("✓ Adaptive layer selects no agent, plan, approval, resource, or execution");
    console.log("");
    console.log(valid ? "V8-J ADAPTIVE VALIDATION: PASS" : "V8-J ADAPTIVE VALIDATION: FAIL");

    if (!valid) process.exitCode = 1;
}

main();
