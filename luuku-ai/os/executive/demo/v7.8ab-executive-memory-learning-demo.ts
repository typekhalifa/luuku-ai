import {
    ExecutiveLearningEngine,
    InMemoryExecutiveMemoryStore,
} from "../executive-memory.js";

async function main(): Promise<void> {
    const now = new Date("2026-09-05T10:00:00.000Z");
    const store = new InMemoryExecutiveMemoryStore();

    await store.save({
        id: "memory-success-1",
        objectiveId: "revenue",
        workflowId: "workflow-1",
        eventType: "ACTION_COMPLETED",
        action: "qualified-prospect-research",
        outcome: "Research completed and proposal prepared.",
        success: true,
        lesson: "Qualified prospect research produced useful proposal context.",
        confidence: 1,
        createdAt: now,
    });

    await store.save({
        id: "memory-failure-1",
        objectiveId: "reliability",
        workflowId: "workflow-2",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "Provider timeout.",
        success: false,
        lesson: "Provider sync needs bounded retry handling.",
        confidence: 0.8,
        createdAt: now,
    });

    await store.save({
        id: "memory-failure-2",
        objectiveId: "reliability",
        workflowId: "workflow-3",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "Provider timeout again.",
        success: false,
        lesson: "Provider sync should avoid repeating the same failing path.",
        confidence: 0.9,
        createdAt: new Date(now.getTime() + 1000),
    });

    const learning = await new ExecutiveLearningEngine(store).learn();
    const success = learning.find((record) => record.action === "qualified-prospect-research");
    const repeatedFailure = learning.find((record) => record.action === "provider-sync");

    if (success?.pattern !== "SUCCESS_PATTERN") throw new Error("AB demo expected a success pattern.");
    if (repeatedFailure?.pattern !== "REPEATED_FAILURE") throw new Error("AB demo expected repeated failure learning.");
    if (repeatedFailure.failedOccurrences !== 2) throw new Error("AB demo expected two provider-sync failures.");
    if (repeatedFailure.lesson !== "Provider sync needs bounded retry handling.") throw new Error("AB demo expected the first recorded lesson to remain inspectable.");

    const before = await store.list();
    await new ExecutiveLearningEngine(store).learn();
    const after = await store.list();
    if (before.length !== after.length) throw new Error("Learning must remain side-effect free.");

    console.log("V7.8-AB EXECUTIVE MEMORY + LEARNING DEMO");
    console.log(`Memory records      : ${before.length}`);
    console.log(`Learned patterns    : ${learning.length}`);
    console.log(`Success pattern     : ${success?.action}`);
    console.log(`Repeated failure    : ${repeatedFailure?.action}`);
    console.log(`Failure occurrences: ${repeatedFailure?.failedOccurrences}`);
    console.log(`Failure confidence  : ${repeatedFailure?.confidence}`);
    console.log("");
    console.log("✓ Executive experiences are stored as inspectable memory records.");
    console.log("✓ Successful actions produce reusable success patterns.");
    console.log("✓ Repeated failures are explicitly detected instead of being forgotten.");
    console.log("✓ Lessons remain attached to the learned action pattern.");
    console.log("✓ Learning is deterministic and side-effect free; it does not execute work.");
}

void main();
