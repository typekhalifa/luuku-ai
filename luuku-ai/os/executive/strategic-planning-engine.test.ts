import { describe, expect, it } from "vitest";
import { ExecutiveStrategicPlanningEngine, type StrategicObjectiveInput } from "./strategic-planning-engine.js";
import type { ExecutiveObjectiveRecord } from "./objective-engine.js";

const now = new Date("2026-09-05T09:00:00.000Z");
const objective = (id: string): ExecutiveObjectiveRecord => ({
    id, title: id, description: id, priority: "high", status: "ACTIVE", progress: 50, createdAt: now, updatedAt: now,
});
const input = (id: string): StrategicObjectiveInput => ({
    objective: objective(id),
    assessment: { objectiveId: id, status: "ACTIVE", progress: 50, attentionRequired: false, reason: "stable" },
    urgency: { objectiveId: id, score: 0, overdue: false, dueSoon: false, stale: false },
    progressTrend: { objectiveId: id, trend: "IMPROVING", delta: 10, interventionScore: 0, interventionRequired: false },
});

describe("ExecutiveStrategicPlanningEngine", () => {
    it("orders dependencies before dependents", () => {
        const dependency = input("dependency");
        const dependent = { ...input("dependent"), dependsOnObjectiveIds: ["dependency"] };
        const plan = new ExecutiveStrategicPlanningEngine().build([dependent, dependency], now);
        expect(plan.dependencyOrder).toEqual(["dependency", "dependent"]);
    });

    it("rejects dependency cycles", () => {
        const a = { ...input("a"), dependsOnObjectiveIds: ["b"] };
        const b = { ...input("b"), dependsOnObjectiveIds: ["a"] };
        expect(() => new ExecutiveStrategicPlanningEngine().build([a, b], now)).toThrow(/dependency cycle/);
    });
});
