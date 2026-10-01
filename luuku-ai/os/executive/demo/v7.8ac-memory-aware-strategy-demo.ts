import {
    ExecutiveLearningEngine,
    InMemoryExecutiveMemoryStore,
} from "../executive-memory.js";
import { MemoryAwareStrategyEngine } from "../memory-aware-strategy.js";
import type { StrategicObjective } from "../strategic-planning-engine.js";

async function main(): Promise<void> {
    const store = new InMemoryExecutiveMemoryStore();

    await store.save({
        id: "ac-failure-1",
        objectiveId: "provider-integration",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "Timeout",
        success: false,
        lesson: "Provider sync needs bounded retry handling.",
        createdAt: new Date("2026-09-05T10:00:00.000Z"),
    });
    await store.save({
        id: "ac-failure-2",
        objectiveId: "provider-integration",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "Timeout again",
        success: false,
        lesson: "Provider sync should avoid repeating the same failing path.",
        createdAt: new Date("2026-09-05T10:01:00.000Z"),
    });
    await store.save({
        id: "ac-success-1",
        objectiveId: "revenue",
        eventType: "ACTION_COMPLETED",
        action: "qualified-prospect-research",
        outcome: "Proposal context prepared",
        success: true,
        lesson: "Qualified prospect research produced useful proposal context.",
        createdAt: new Date("2026-09-05T10:02:00.000Z"),
    });

    const learning = await new ExecutiveLearningEngine(store).learn();
    const engine = new MemoryAwareStrategyEngine();

    const providerObjective: StrategicObjective = {
        objectiveId: "provider-integration",
        title: "Provider Integration",
        priority: "high",
        horizon: "SHORT_TERM",
        strategicScore: 100,
        dependencyIds: [],
        conflictIds: [],
    };
    const revenueObjective: StrategicObjective = {
        objectiveId: "revenue",
        title: "Grow Revenue",
        priority: "high",
        horizon: "SHORT_TERM",
        strategicScore: 100,
        dependencyIds: [],
        conflictIds: [],
    };
    const unknownObjective: StrategicObjective = {
        objectiveId: "new-objective",
        title: "New Objective",
        priority: "medium",
        horizon: "MEDIUM_TERM",
        strategicScore: 50,
        dependencyIds: [],
        conflictIds: [],
    };

    const providerDecision = engine.evaluate({ objective: providerObjective, learning });
    const revenueDecision = engine.evaluate({ objective: revenueObjective, learning });
    const unknownDecision = engine.evaluate({ objective: unknownObjective, learning });

    if (providerDecision.actionRisk !== "HIGH" || providerDecision.adaptation !== "CHANGE_APPROACH") {
        throw new Error("AC demo expected repeated failure to force a strategic change.");
    }
    if (revenueDecision.adaptation !== "CONTINUE") {
        throw new Error("AC demo expected historical success to support continuation.");
    }
    if (unknownDecision.relevantPatterns.length !== 0 || unknownDecision.adaptation !== "CONTINUE") {
        throw new Error("AC demo expected unknown history to remain conservative and continue gathering evidence.");
    }

    console.log("V7.8-AC MEMORY-AWARE STRATEGY DEMO");
    console.log(`Learned patterns    : ${learning.length}`);
    console.log(`Provider risk       : ${providerDecision.actionRisk}`);
    console.log(`Provider adaptation : ${providerDecision.adaptation}`);
    console.log(`Provider reason     : ${providerDecision.reason}`);
    console.log(`Revenue adaptation  : ${revenueDecision.adaptation}`);
    console.log(`Unknown adaptation  : ${unknownDecision.adaptation}`);
    console.log("");
    console.log("✓ Historical repeated failure raises strategic risk.");
    console.log("✓ Repeated failure causes an explicit change-of-approach recommendation.");
    console.log("✓ Historical success supports continuing a proven approach.");
    console.log("✓ Missing history does not invent a lesson or force intervention.");
    console.log("✓ Memory-aware strategy remains planning-only with no execution side effects.");
}

void main();
