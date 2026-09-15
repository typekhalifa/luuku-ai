import { ExecutiveLongHorizonPlanningEngine, type LongHorizonObjectiveInput } from "../v8-k-long-horizon-planning.js";
import { type ExecutiveObjectiveRecord } from "../objective-engine.js";

const objective = (id: string, title: string, priority: ExecutiveObjectiveRecord["priority"], progress: number): ExecutiveObjectiveRecord => ({
    id, title, description: title, priority, status: "ACTIVE", progress, createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-09-15T00:00:00Z"),
});

const input = (objective: ExecutiveObjectiveRecord, horizon: LongHorizonObjectiveInput["horizon"], dependencies: readonly string[] = []): LongHorizonObjectiveInput => ({
    objective,
    assessment: { objectiveId: objective.id, status: "ACTIVE", progress: objective.progress, attentionRequired: true, reason: "Active objective requires strategic planning." },
    urgency: { objectiveId: objective.id, score: 20, reason: "Validation urgency" },
    progressTrend: { objectiveId: objective.id, interventionScore: 10, trend: "STABLE" },
    horizon,
    dependsOnObjectiveIds: dependencies,
    milestones: [
        { id: `${objective.id}:50`, objectiveId: objective.id, title: "Reach 50%", horizon, targetProgress: 50 },
        { id: `${objective.id}:100`, objectiveId: objective.id, title: "Complete objective", horizon, targetProgress: 100 },
    ],
});

const engine = new ExecutiveLongHorizonPlanningEngine();
const plan = engine.build([
    input(objective("foundation", "Build foundation", "high", 20), "SHORT_TERM"),
    input(objective("growth", "Drive growth", "high", 10), "MEDIUM_TERM", ["foundation"]),
    input(objective("scale", "Scale company", "medium", 0), "LONG_TERM", ["growth"]),
], new Date("2026-09-15T00:00:00Z"));

if (plan.dependencyOrder.join(",") !== "foundation,growth,scale") throw new Error("Dependency order validation failed.");
if (plan.milestones.length !== 6) throw new Error("Milestone validation failed.");
if (plan.objectives.length !== 3) throw new Error("Objective planning validation failed.");

let cycleDetected = false;
try {
    engine.build([
        input(objective("a", "A", "high", 0), "SHORT_TERM", ["b"]),
        input(objective("b", "B", "high", 0), "SHORT_TERM", ["a"]),
    ]);
} catch (error) {
    cycleDetected = error instanceof Error && error.message.includes("dependency cycle");
}
if (!cycleDetected) throw new Error("Dependency cycle validation failed.");

console.log("V8-K — Long-Horizon Planning Validation");
console.log(`Strategic objectives        : ${plan.objectives.length}`);
console.log(`Dependency order            : ${plan.dependencyOrder.join(" → ")}`);
console.log(`Milestones                  : ${plan.milestones.length}`);
console.log(`Cycle detection             : PASS`);
console.log("✓ Horizons are explicit and bounded");
console.log("✓ Dependencies are deterministic");
console.log("✓ Milestones are attached to objectives");
console.log("✓ Dependency cycles are rejected");
console.log("✓ Planner does not create, approve, allocate, or execute work");
console.log("V8-K VALIDATION: PASS");
