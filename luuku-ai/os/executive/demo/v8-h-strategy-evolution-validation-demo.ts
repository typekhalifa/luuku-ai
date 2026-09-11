import { InMemoryExecutiveObjectiveStore, type ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveStrategyEvolutionEngine } from "../executive-strategy-evolution.js";
import type { ExecutiveLearningRecord } from "../executive-memory.js";

async function main(): Promise<void> {
    console.log("V8-H — Strategy Evolution Validation");
    console.log("------------------------------------");

    const store = new InMemoryExecutiveObjectiveStore();
    const now = new Date();

    const activeObjective: ExecutiveObjectiveRecord = {
        id: "objective-revenue",
        title: "Close Qualified Prospects",
        description: "Increase qualified prospect conversions.",
        priority: "low",
        status: "ACTIVE",
        progress: 35,
        previousProgress: 35,
        staleAfterDays: 30,
        createdAt: now,
        updatedAt: now,
    };

    await store.save(activeObjective);

    const learning: ExecutiveLearningRecord[] = [
        {
            pattern: "REPEATED_FAILURE",
            action: "cold-outreach",
            objectiveIds: ["objective-revenue"],
            occurrences: 4,
            successfulOccurrences: 0,
            failedOccurrences: 4,
            confidence: 0,
            lesson: "Improve outreach reliability before repeating the same operating pattern.",
        },
        {
            pattern: "SUCCESS_PATTERN",
            action: "qualified-demo",
            objectiveIds: ["objective-revenue"],
            occurrences: 4,
            successfulOccurrences: 3,
            failedOccurrences: 1,
            confidence: 0.75,
            lesson: "Scale the qualified-demo pattern while preserving quality.",
        },
    ];

    const engine = new ExecutiveStrategyEvolutionEngine(store, {
        maxProposals: 3,
        minConfidence: 0.5,
        applyChanges: true,
    });

    const decision = await engine.evolve([activeObjective], learning);
    const objectivesAfter = await store.list();

    const createdFailure = decision.createdObjectiveIds.includes(
        "objective-improve-cold-outreach-objective-revenue",
    );
    const createdSuccess = decision.createdObjectiveIds.includes(
        "objective-scale-qualified-demo-objective-revenue",
    );
    const modifiedRevenue = decision.modifiedObjectiveIds.includes("objective-revenue");
    const revenueAfter = objectivesAfter.find((objective) => objective.id === "objective-revenue");

    assert(createdFailure, "Repeated failure should create a recovery objective.");
    assert(createdSuccess, "High-confidence success should create a scaling objective.");
    assert(modifiedRevenue, "Stagnant active objective should receive a priority modification.");
    assert(revenueAfter?.priority === "medium", "Low-priority stagnant objective should be promoted to medium.");

    console.log(`Proposals            : ${decision.proposals.length}`);
    console.log(`Created              : ${decision.createdObjectiveIds.length}`);
    console.log(`Modified             : ${decision.modifiedObjectiveIds.length}`);
    console.log(`Deferred             : ${decision.deferredObjectiveIds.length}`);
    console.log(`Evidence records     : ${decision.evidence.length}`);
    console.log("");
    console.log("Validated paths:");
    console.log("✓ Repeated failure → recovery objective");
    console.log("✓ Successful pattern → scaling objective");
    console.log("✓ Stagnant objective → priority modification");
    console.log("");
    console.log("Objectives after evolution:");
    for (const objective of objectivesAfter) {
        console.log(`- ${objective.id} | ${objective.priority} | ${objective.status} | ${objective.title}`);
    }
    console.log("");
    console.log("V8-H VALIDATION: PASS");
}

function assert(condition: boolean, message: string): asserts condition {
    if (!condition) throw new Error(`V8-H validation failed: ${message}`);
}

void main().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
});
