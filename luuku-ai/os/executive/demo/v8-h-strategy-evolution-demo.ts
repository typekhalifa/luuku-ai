import {
    ExecutiveStrategyEvolutionEngine,
} from "../executive-strategy-evolution.js";
import {
    InMemoryExecutiveObjectiveStore,
    type ExecutiveObjectiveRecord,
} from "../objective-engine.js";
import {
    InMemoryExecutiveMemoryStore,
    type ExecutiveMemoryRecord,
} from "../executive-memory.js";

const objectiveStore = new InMemoryExecutiveObjectiveStore();
const memoryStore = new InMemoryExecutiveMemoryStore();

const now = new Date();
const objective: ExecutiveObjectiveRecord = {
    id: "objective-revenue",
    title: "Close Qualified Prospects",
    description: "Convert qualified prospects into meetings and customers.",
    priority: "high",
    status: "ACTIVE",
    progress: 35,
    previousProgress: 35,
    staleAfterDays: 1,
    createdAt: new Date(now.getTime() - 3 * 86_400_000),
    updatedAt: new Date(now.getTime() - 2 * 86_400_000),
};

await objectiveStore.save(objective);

const repeatedFailure: ExecutiveMemoryRecord[] = [
    {
        id: "memory-sales-1",
        objectiveId: objective.id,
        eventType: "ACTION_FAILED",
        action: "cold-outreach",
        outcome: "Prospect did not respond after approved outreach sequence.",
        success: false,
        lesson: "Repeated cold outreach failures suggest improving targeting before increasing volume.",
        confidence: 0.9,
        createdAt: new Date(now.getTime() - 2 * 86_400_000),
    },
    {
        id: "memory-sales-2",
        objectiveId: objective.id,
        eventType: "ACTION_FAILED",
        action: "cold-outreach",
        outcome: "Prospect rejected the outreach sequence.",
        success: false,
        lesson: "Repeated cold outreach failures suggest improving targeting before increasing volume.",
        confidence: 0.9,
        createdAt: new Date(now.getTime() - 86_400_000),
    },
];

for (const record of repeatedFailure) await memoryStore.save(record);

const learning = [
    {
        pattern: "REPEATED_FAILURE" as const,
        action: "cold-outreach",
        objectiveIds: [objective.id],
        occurrences: 2,
        successfulOccurrences: 0,
        failedOccurrences: 2,
        confidence: 0,
        lesson: "Repeated cold outreach failures suggest improving targeting before increasing volume.",
    },
];

// Demonstrate V8-H directly with deterministic learning evidence.
// The engine is bounded to two proposals and applies only executive objective state changes.
const engine = new ExecutiveStrategyEvolutionEngine(objectiveStore, {
    maxProposals: 2,
    minConfidence: 0,
    applyChanges: true,
});

const decision = await engine.evolve([objective], learning);
const objectivesAfter = await objectiveStore.list();

console.log("V8-H — Autonomous Strategy & Objective Evolution");
console.log("-----------------------------------------------");
console.log(`Existing objectives : ${objectivesAfter.filter((item) => item.id === objective.id).length}`);
console.log(`Proposals            : ${decision.proposals.length}`);
console.log(`Created              : ${decision.createdObjectiveIds.join(", ") || "none"}`);
console.log(`Modified             : ${decision.modifiedObjectiveIds.join(", ") || "none"}`);
console.log(`Evidence records     : ${decision.evidence.length}`);
console.log("\nObjectives after evolution:");
for (const item of objectivesAfter) {
    console.log(`- ${item.id} | ${item.priority} | ${item.status} | ${item.title}`);
}
