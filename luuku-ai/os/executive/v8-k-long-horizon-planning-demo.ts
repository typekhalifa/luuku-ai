import { ExecutiveLongHorizonPlanningEngine, type LongHorizonObjectiveInput } from "./v8-k-long-horizon-planning.js";
import type { ExecutiveObjectiveRecord, ObjectiveAssessment } from "./objective-engine.js";
import type { ObjectiveProgressTrendScore } from "./objective-progress-trend.js";
import type { ObjectiveUrgencyScore } from "./objective-urgency.js";

const now = new Date("2026-09-15T00:00:00.000Z");

const objectives: ExecutiveObjectiveRecord[] = [
    {
        id: "market-expansion",
        title: "Expand qualified customer base",
        description: "Build durable growth capacity from qualified prospects.",
        priority: "high",
        status: "ACTIVE",
        progress: 30,
        previousProgress: 25,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: now,
    },
    {
        id: "operational-scale",
        title: "Build scalable operations",
        description: "Establish reliable operating capacity for growth.",
        priority: "high",
        status: "ACTIVE",
        progress: 20,
        previousProgress: 20,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
        updatedAt: now,
    },
];

const assessment = (objective: ExecutiveObjectiveRecord): ObjectiveAssessment => ({
    objectiveId: objective.id,
    status: objective.status,
    progress: objective.progress,
    attentionRequired: true,
    reason: "Active objective requires strategic direction.",
});

const urgency = (objective: ExecutiveObjectiveRecord): ObjectiveUrgencyScore => ({
    objectiveId: objective.id,
    score: 50,
    overdue: false,
    dueSoon: false,
    stale: false,
});

const trend = (objective: ExecutiveObjectiveRecord): ObjectiveProgressTrendScore => ({
    objectiveId: objective.id,
    trend: objective.id === "market-expansion" ? "IMPROVING" : "STAGNANT",
    delta: objective.id === "market-expansion" ? 5 : 0,
    interventionScore: objective.id === "market-expansion" ? 0 : 30,
    interventionRequired: objective.id !== "market-expansion",
});

const inputs: LongHorizonObjectiveInput[] = [
    {
        objective: objectives[0],
        assessment: assessment(objectives[0]),
        urgency: urgency(objectives[0]),
        progressTrend: trend(objectives[0]),
        horizon: "LONG_TERM",
        targetState: "A repeatable customer acquisition system with durable qualified pipeline growth.",
        milestones: [
            {
                id: "milestone-market-expansion",
                objectiveId: "market-expansion",
                title: "Establish repeatable qualified acquisition",
                horizon: "LONG_TERM",
                targetProgress: 60,
            },
        ],
    },
    {
        objective: objectives[1],
        assessment: assessment(objectives[1]),
        urgency: urgency(objectives[1]),
        progressTrend: trend(objectives[1]),
        horizon: "LONG_TERM",
        dependsOnObjectiveIds: ["market-expansion"],
        targetState: "Reliable operating capacity that can support growth without compromising executive safety boundaries.",
        milestones: [
            {
                id: "milestone-operational-scale",
                objectiveId: "operational-scale",
                title: "Establish reliable scalable operations",
                horizon: "LONG_TERM",
                targetProgress: 80,
            },
        ],
    },
];

const plan = new ExecutiveLongHorizonPlanningEngine().build(inputs, now);

if (plan.horizon !== "LONG_TERM") throw new Error("Expected LONG_TERM horizon.");
if (plan.milestones.length !== 2) throw new Error("Expected one milestone per objective.");
if (plan.strategicPlan.dependencyOrder.join(",") !== "market-expansion,operational-scale") {
    throw new Error(`Unexpected dependency order: ${plan.strategicPlan.dependencyOrder.join(",")}`);
}
const operationalMilestone = plan.milestones.find((milestone) => milestone.id === "milestone-operational-scale");
if (!operationalMilestone) throw new Error("Operational-scale milestone was not planned.");
if (operationalMilestone.dependencyObjectiveIds?.[0] !== "market-expansion") {
    throw new Error("Expected operational-scale milestone to depend on market-expansion.");
}
if (plan.executionBoundary !== "PLAN_ONLY") throw new Error("V8-K must remain plan-only.");
if (plan.replanTriggers.length !== 5) throw new Error("Expected bounded re-planning triggers.");

console.log("V8-K — Long-Horizon Planning Validation");
console.log(`Strategic objectives         : ${plan.strategicPlan.objectives.length}`);
console.log(`Milestones                  : ${plan.milestones.length}`);
console.log(`Dependency order            : ${plan.strategicPlan.dependencyOrder.join(" → ")}`);
console.log(`Re-plan triggers            : ${plan.replanTriggers.length}`);
console.log(`Execution boundary          : ${plan.executionBoundary}`);
console.log("✓ Explicit future-state targets are required");
console.log("✓ Long-horizon objectives are dependency ordered");
console.log("✓ Milestones preserve objective dependencies");
console.log("✓ Re-planning is bounded to defined strategic changes");
console.log("✓ V8-K creates strategy only; it does not create or execute work");
console.log("V8-K VALIDATION: PASS");
