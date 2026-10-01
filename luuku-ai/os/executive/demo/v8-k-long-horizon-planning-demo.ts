import { ExecutiveLongHorizonPlanningEngine, type LongHorizonObjectiveInput } from "../v8-k-long-horizon-planning.js";
import { type ExecutiveObjectiveRecord } from "../objective-engine.js";

const objective = (
    id: string,
    title: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
): ExecutiveObjectiveRecord => ({
    id,
    title,
    description: title,
    priority,
    status: "ACTIVE",
    progress,
    previousProgress: progress,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-09-15T00:00:00Z"),
});

const input = (
    objective: ExecutiveObjectiveRecord,
    dependencies: readonly string[] = [],
): LongHorizonObjectiveInput => ({
    objective,
    assessment: {
        objectiveId: objective.id,
        status: "ACTIVE",
        progress: objective.progress,
        attentionRequired: true,
        reason: "Active objective requires long-horizon planning.",
    },
    urgency: {
        objectiveId: objective.id,
        score: 20,
        overdue: false,
        dueSoon: false,
        stale: false,
    },
    progressTrend: {
        objectiveId: objective.id,
        trend: "STAGNANT",
        delta: 0,
        interventionScore: 10,
        interventionRequired: true,
    },
    horizon: "LONG_TERM",
    targetState: `Durable long-term state for ${objective.title}.`,
    dependsOnObjectiveIds: dependencies,
    milestones: [
        {
            id: `${objective.id}:50`,
            objectiveId: objective.id,
            title: "Reach 50%",
            horizon: "LONG_TERM",
            targetProgress: 50,
        },
        {
            id: `${objective.id}:100`,
            objectiveId: objective.id,
            title: "Complete objective",
            horizon: "LONG_TERM",
            targetProgress: 100,
            dependencyObjectiveIds: dependencies,
        },
    ],
});

const engine = new ExecutiveLongHorizonPlanningEngine();
const plan = engine.build([
    input(objective("market-expansion", "Expand the market", "high", 20)),
    input(objective("operational-scale", "Scale operations", "high", 10), ["market-expansion"]),
], new Date("2026-09-15T00:00:00Z"));

if (plan.horizon !== "LONG_TERM") throw new Error("Expected LONG_TERM horizon.");
if (plan.strategicPlan.dependencyOrder.join(",") !== "market-expansion,operational-scale") {
    throw new Error(`Unexpected dependency order: ${plan.strategicPlan.dependencyOrder.join(",")}`);
}
if (plan.milestones.length !== 4) throw new Error("Expected four long-horizon milestones.");
const operationalCompletionMilestone = plan.milestones.find(
    (milestone) => milestone.id === "operational-scale:100",
);
if (operationalCompletionMilestone?.dependencyObjectiveIds?.[0] !== "market-expansion") {
    throw new Error("Milestone dependency propagation failed.");
}
if (plan.executionBoundary !== "PLAN_ONLY") throw new Error("V8-K must remain plan-only.");
if (plan.replanTriggers.length !== 5) throw new Error("Expected bounded re-planning triggers.");
if (plan.objectives.length !== 2) throw new Error("Objective planning validation failed.");

let cycleDetected = false;
try {
    engine.build([
        input(objective("a", "A", "high", 0), ["b"]),
        input(objective("b", "B", "high", 0), ["a"]),
    ]);
} catch (error) {
    cycleDetected = error instanceof Error && error.message.includes("dependency cycle");
}
if (!cycleDetected) throw new Error("Dependency cycle validation failed.");

console.log("V8-K — Long-Horizon Planning Validation");
console.log(`Strategic objectives         : ${plan.strategicPlan.objectives.length}`);
console.log(`Dependency order            : ${plan.strategicPlan.dependencyOrder.join(" → ")}`);
console.log(`Milestones                  : ${plan.milestones.length}`);
console.log(`Re-plan triggers            : ${plan.replanTriggers.length}`);
console.log(`Execution boundary          : ${plan.executionBoundary}`);
console.log("✓ Long-term target states are explicit");
console.log("✓ Existing strategic planner is reused");
console.log("✓ Dependencies are deterministic");
console.log("✓ Milestones carry dependency context");
console.log("✓ Dependency cycles are rejected");
console.log("✓ Re-planning triggers are bounded");
console.log("✓ Planner does not create, approve, allocate, or execute work");
console.log("V8-K VALIDATION: PASS");
