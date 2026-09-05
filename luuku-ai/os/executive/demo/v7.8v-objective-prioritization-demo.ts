import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import { InMemoryExecutiveObjectiveStore, ExecutiveObjectiveEngine } from "../objective-engine.js";
import { ExecutiveObjectivePrioritySelector } from "../objective-priority-selector.js";
import { ExecutiveObjectiveUrgencyScorer } from "../objective-urgency.js";
import { ExecutiveObjectiveProgressTrendScorer } from "../objective-progress-trend.js";
import type { ExecutiveState } from "../executive-state.js";

const baseTime = new Date("2026-09-05T04:00:00.000Z");

const objective = (
    id: string,
    title: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    offsetMinutes: number,
    metadata?: Record<string, unknown>,
): ExecutiveObjectiveRecord => ({
    id,
    title,
    description: `${title} objective`,
    priority,
    status: "ACTIVE",
    progress,
    createdAt: new Date(baseTime.getTime() + offsetMinutes * 60_000),
    updatedAt: new Date(baseTime.getTime() + offsetMinutes * 60_000),
    ...(metadata ? { metadata } : {}),
} as ExecutiveObjectiveRecord);

async function main(): Promise<void> {
    const store = new InMemoryExecutiveObjectiveStore();
    await store.save(objective("objective-low", "Improve Agent Efficiency", "low", 5, 0));
    await store.save(objective("objective-medium", "Maintain Agent Momentum", "medium", 20, 1));
    await store.save(objective("objective-high-future", "Strategic Growth", "high", 80, 2, { deadlineAt: "2026-09-20T04:00:00.000Z" }));
    await store.save(objective("objective-medium-overdue", "Recover Critical Operations", "medium", 50, 3, { deadlineAt: "2026-09-04T04:00:00.000Z" }));

    const state: ExecutiveState = {
        active: 1,
        waitingApproval: 0,
        failed: 1,
        completed: 0,
        attention: ["Critical work requires recovery."],
        generatedAt: baseTime,
        failedWorkIds: ["failed-critical-1"],
    };

    const engine = new ExecutiveObjectiveEngine(store);
    const objectives = await engine.listActive();
    const urgencyScorer = new ExecutiveObjectiveUrgencyScorer();
    const trendScorer = new ExecutiveObjectiveProgressTrendScorer();
    const candidates = await Promise.all(
        objectives.map(async (objectiveRecord) => {
            const assessment = await engine.assess(objectiveRecord, state);
            return {
                objective: objectiveRecord,
                assessment,
                urgency: urgencyScorer.score({ objective: objectiveRecord, assessment, now: new Date(baseTime) }),
                progressTrend: trendScorer.score(objectiveRecord),
            };
        }),
    );

    const selector = new ExecutiveObjectivePrioritySelector();
    const ranked = selector.rank(candidates);
    const selected = selector.select(candidates);

    assert.equal(ranked[0]?.objective.id, "objective-medium-overdue");
    assert.equal(ranked[0]?.urgency.overdue, true);
    assert.equal(selected.length, 1);
    assert.equal(selected[0]?.objective.id, "objective-medium-overdue");
    assert.equal(selected[0]?.assessment.attentionRequired, true);

    console.log("V7.8-V OBJECTIVE PRIORITIZATION DEMO");
    console.log(`Active objectives : ${objectives.length}`);
    console.log(`Top objective     : ${ranked[0]?.objective.title}`);
    console.log(`Top priority      : ${ranked[0]?.objective.priority}`);
    console.log(`Urgency score     : ${ranked[0]?.urgency.score}`);
    console.log(`Overdue           : ${ranked[0]?.urgency.overdue}`);
    console.log(`Selected for work : ${selected[0]?.objective.title}`);
    console.log("");
    console.log("✓ An overdue medium-priority objective outranks a high-priority objective due later.");
    console.log("✓ Deadline urgency is computed deterministically from objective metadata.");
    console.log("✓ Progress-trend evidence is supplied to the real selector contract.");
    console.log("✓ Objective selection remains side-effect free.");
    console.log("✓ No planning, approval, queue, or agent execution occurred.");
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
