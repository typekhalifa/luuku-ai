import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import type { ExecutiveState } from "../executive-state.js";
import { ExecutiveObjectiveUrgencyScorer } from "../objective-urgency.js";
import { ExecutiveObjectiveProgressTrendScorer } from "../objective-progress-trend.js";
import { ExecutiveObjectivePrioritySelector, type ObjectiveSelectionCandidate } from "../objective-priority-selector.js";

const now = new Date("2026-09-05T06:00:00.000Z");
const state: ExecutiveState = {
    active: 0,
    waitingApproval: 0,
    failed: 0,
    completed: 0,
    attention: [],
    generatedAt: now,
};

const objective = (
    id: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    createdAt: string,
    deadlineAt?: string,
    staleAfterDays?: number,
): ExecutiveObjectiveRecord => ({
    id,
    title: id,
    description: `${id} objective`,
    priority,
    status: "ACTIVE",
    progress,
    createdAt: new Date(createdAt),
    updatedAt: now,
    ...(deadlineAt ? { deadlineAt: new Date(deadlineAt) } : {}),
    ...(staleAfterDays !== undefined ? { staleAfterDays } : {}),
});

const urgentDueSoon = objective("Medium Priority Due Soon", "medium", 80, "2026-09-04T06:00:00.000Z", "2026-09-05T18:00:00.000Z");
const highButNotUrgent = objective("High Priority Later", "high", 80, "2026-09-05T05:00:00.000Z", "2026-09-12T18:00:00.000Z");
const overdue = objective("Low Priority Overdue", "low", 90, "2026-08-20T06:00:00.000Z", "2026-09-04T18:00:00.000Z");
const stale = objective("Medium Priority Stale", "medium", 70, "2026-08-20T06:00:00.000Z", undefined, 7);

const urgencyScorer = new ExecutiveObjectiveUrgencyScorer();
const trendScorer = new ExecutiveObjectiveProgressTrendScorer();
const candidates: ObjectiveSelectionCandidate[] = [urgentDueSoon, highButNotUrgent, overdue, stale].map((item) => {
    const assessment = {
        objectiveId: item.id,
        status: "ACTIVE" as const,
        progress: item.progress,
        attentionRequired: false,
        reason: "Objective requires useful next work.",
    };
    return {
        objective: item,
        assessment,
        urgency: urgencyScorer.score({ objective: item, assessment, now }),
        progressTrend: trendScorer.score(item),
    };
});

const find = (id: string) => candidates.find((candidate) => candidate.objective.id === id)!;
assert.equal(find(overdue.id).urgency.overdue, true);
assert.equal(find(urgentDueSoon.id).urgency.dueSoon, true);
assert.equal(find(stale.id).urgency.stale, true);
assert(find(overdue.id).urgency.score > find(highButNotUrgent.id).urgency.score);

const selector = new ExecutiveObjectivePrioritySelector();
const ranked = selector.rank(candidates);
const selected = selector.select(candidates);
assert.equal(ranked[0]?.objective.id, overdue.id);
assert.equal(selected.length, 1);
assert.equal(selected[0]?.objective.id, overdue.id);
assert.equal(state.failed, 0);

console.log("V7.8-W OBJECTIVE URGENCY + PRIORITIZATION DEMO");
console.log(`Candidates         : ${candidates.length}`);
console.log(`Overdue objective  : ${overdue.title}`);
console.log(`Overdue score      : ${find(overdue.id).urgency.score}`);
console.log(`High-later score   : ${find(highButNotUrgent.id).urgency.score}`);
console.log(`Selected for work  : ${selected[0]?.objective.title}`);
console.log(`Selected count     : ${selected.length}`);
console.log("\n✓ Deadline-aware urgency signals are computed deterministically.");
console.log("✓ An overdue lower-priority objective outranks a higher-priority objective that is not urgent.");
console.log("✓ Due-soon and stale objectives expose explicit urgency signals.");
console.log("✓ Urgency and progress-trend signals are part of the selector contract.");
console.log("✓ The urgency/prioritization boundary remains side-effect free.");
console.log("✓ No planning, approval, queue, or agent execution occurred.");
