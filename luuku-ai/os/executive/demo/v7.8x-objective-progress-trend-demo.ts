import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import { ExecutiveObjectiveProgressTrendScorer } from "../objective-progress-trend.js";
import { ExecutiveObjectivePrioritySelector, type ObjectiveSelectionCandidate } from "../objective-priority-selector.js";
import { ExecutiveObjectiveUrgencyScorer } from "../objective-urgency.js";

const now = new Date("2026-09-05T07:00:00.000Z");

const objective = (
    id: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    previousProgress?: number,
): ExecutiveObjectiveRecord => ({
    id,
    title: id,
    description: `${id} objective`,
    priority,
    status: "ACTIVE",
    progress,
    ...(previousProgress !== undefined ? { previousProgress } : {}),
    createdAt: new Date("2026-09-01T07:00:00.000Z"),
    updatedAt: now,
});

const improving = objective("Improving Objective", "high", 70, 50);
const stagnant = objective("Stagnant Objective", "high", 50, 50);
const regressing = objective("Regressing Objective", "medium", 40, 65);
const unknown = objective("Unknown Baseline Objective", "low", 30);

const trendScorer = new ExecutiveObjectiveProgressTrendScorer();
const improvingTrend = trendScorer.score(improving);
const stagnantTrend = trendScorer.score(stagnant);
const regressingTrend = trendScorer.score(regressing);
const unknownTrend = trendScorer.score(unknown);

assert.equal(improvingTrend.trend, "IMPROVING");
assert.equal(improvingTrend.delta, 20);
assert.equal(stagnantTrend.trend, "STAGNANT");
assert.equal(regressingTrend.trend, "REGRESSING");
assert.equal(regressingTrend.delta, -25);
assert.equal(regressingTrend.interventionRequired, true);
assert.equal(unknownTrend.trend, "UNKNOWN");

const urgencyScorer = new ExecutiveObjectiveUrgencyScorer();
const candidates: ObjectiveSelectionCandidate[] = [improving, stagnant, regressing, unknown].map((item) => {
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

const selector = new ExecutiveObjectivePrioritySelector();
const ranked = selector.rank(candidates);

assert.equal(ranked[0]?.objective.id, regressing.id);
assert.equal(selector.select(candidates).length, 1);
assert.equal(selector.select(candidates)[0]?.objective.id, regressing.id);

console.log("V7.8-X OBJECTIVE PROGRESS TREND DEMO");
console.log(`Candidates         : ${candidates.length}`);
console.log(`Improving delta    : +${improvingTrend.delta}`);
console.log(`Stagnant delta     : ${stagnantTrend.delta}`);
console.log(`Regressing delta   : ${regressingTrend.delta}`);
console.log(`Selected for work  : ${ranked[0]?.objective.title}`);
console.log(`Selected trend     : ${ranked[0]?.progressTrend.trend}`);
console.log(`Intervention score : ${ranked[0]?.progressTrend.interventionScore}`);

console.log("\n✓ Objective progress movement is classified deterministically.");
console.log("✓ Improving, stagnant, regressing, and unknown baselines are distinguished.");
console.log("✓ Regression creates an explicit intervention signal.");
console.log("✓ Progress trend participates in the real objective selector contract.");
console.log("✓ A regressing objective can outrank otherwise stronger work when urgency is tied.");
console.log("✓ Trend analysis remains side-effect free; no planning or execution occurred.");
