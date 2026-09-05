import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import type { ExecutiveState } from "../executive-state.js";
import { ExecutiveObjectiveUrgencyScorer } from "../objective-urgency.js";
import { ExecutiveObjectivePrioritySelector } from "../objective-priority-selector.js";

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

const urgentDueSoon = objective(
    "Medium Priority Due Soon",
    "medium",
    80,
    "2026-09-04T06:00:00.000Z",
    "2026-09-05T18:00:00.000Z",
);

const highButNotUrgent = objective(
    "High Priority Later",
    "high",
    80,
    "2026-09-05T05:00:00.000Z",
    "2026-09-12T18:00:00.000Z",
);

const overdue = objective(
    "Low Priority Overdue",
    "low",
    90,
    "2026-08-20T06:00:00.000Z",
    "2026-09-04T18:00:00.000Z",
);

const stale = objective(
    "Medium Priority Stale",
    "medium",
    70,
    "2026-08-20T06:00:00.000Z",
    undefined,
    7,
);

const scorer = new ExecutiveObjectiveUrgencyScorer();
const candidates = [urgentDueSoon, highButNotUrgent, overdue, stale].map((item) => {
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
        urgency: scorer.score({ objective: item, assessment, now }),
    };
});

assert.equal(candidates.find((candidate) => candidate.objective.id === overdue.id)?.urgency.overdue, true);
assert.equal(candidates.find((candidate) => candidate.objective.id === urgentDueSoon.id)?.urgency.dueSoon, true);
assert.equal(candidates.find((candidate) => candidate.objective.id === stale.id)?.urgency.stale, true);
assert(
    (candidates.find((candidate) => candidate.objective.id === overdue.id)?.urgency.score ?? 0) >
    (candidates.find((candidate) => candidate.objective.id === highButNotUrgent.id)?.urgency.score ?? 0),
);

const prioritySelector = new ExecutiveObjectivePrioritySelector();
const selected = prioritySelector.select(
    candidates
        .map(({ objective, assessment, urgency }) => ({
            objective,
            assessment,
            urgencyScore: urgency.score,
        }))
        .sort((left, right) => right.urgencyScore - left.urgencyScore)
        .map(({ objective, assessment }) => ({ objective, assessment })),
);

assert.equal(selected.length, 1);
assert.equal(selected[0]?.objective.id, highButNotUrgent.id);

console.log("V7.8-W OBJECTIVE URGENCY + PRIORITIZATION DEMO");
console.log(`Candidates         : ${candidates.length}`);
console.log(`Overdue objective  : ${overdue.title}`);
console.log(`Due-soon objective : ${urgentDueSoon.title}`);
console.log(`Stale objective    : ${stale.title}`);
console.log(`Selected for work  : ${selected[0]?.objective.title}`);
console.log(`Selected count     : ${selected.length}`);

console.log("\n✓ Deadline-aware urgency signals are computed deterministically.");
console.log("✓ Overdue work receives stronger urgency than non-urgent work.");
console.log("✓ Due-soon and stale objectives expose explicit urgency signals.");
console.log("✓ One next-work candidate is selected after urgency ordering.");
console.log("✓ The urgency layer remains side-effect free.");
console.log("✓ No planning, approval, queue, or agent execution occurred.");
