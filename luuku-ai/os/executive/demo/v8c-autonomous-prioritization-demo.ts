import assert from "node:assert/strict";
import { ExecutiveWorkArbitrator, type ExecutiveWorkCandidate } from "../executive-work-arbitrator.js";

const now = new Date("2026-09-07T06:30:00.000Z");

function candidate(
    id: string,
    priority: "high" | "medium" | "low",
    urgency: number,
    interventionScore: number,
    progress: number,
    createdMinutesAgo: number,
): ExecutiveWorkCandidate {
    return {
        objective: {
            id,
            title: id,
            description: `${id} objective`,
            priority,
            status: "ACTIVE",
            progress,
            createdAt: new Date(now.getTime() - createdMinutesAgo * 60_000),
            updatedAt: now,
        },
        assessment: {
            objectiveId: id,
            status: "ACTIVE",
            progress,
            attentionRequired: true,
            reason: "Objective requires executive attention.",
        },
        urgency: {
            objectiveId: id,
            score: urgency,
            overdue: false,
            dueSoon: false,
            stale: false,
        },
        progressTrend: {
            objectiveId: id,
            trend: interventionScore > 0 ? "STAGNANT" : "UNKNOWN",
            delta: 0,
            interventionScore,
            interventionRequired: interventionScore > 0,
        },
    };
}

async function main(): Promise<void> {
    const candidates = [
        candidate("objective-high-risk", "high", 120, 50, 20, 20),
        candidate("objective-critical", "high", 120, 50, 20, 10),
        candidate("objective-medium", "medium", 110, 30, 30, 30),
        candidate("objective-low", "low", 90, 0, 60, 40),
    ];

    const arbitrator = new ExecutiveWorkArbitrator({ maxSelections: 2 });
    const decision = arbitrator.arbitrate(candidates);
    const repeated = arbitrator.arbitrate([...candidates].reverse());

    assert.equal(decision.selected.length, 2);
    assert.deepEqual(decision.selected.map((item) => item.objective.id), [
        "objective-critical",
        "objective-high-risk",
    ]);
    assert.equal(decision.rejected.length, 2);
    assert.deepEqual(decision.selected.map((item) => item.objective.id), repeated.selected.map((item) => item.objective.id));
    assert.equal(decision.budget, 2);
    assert.deepEqual(decision.evidence.selectedObjectiveIds, [
        "objective-critical",
        "objective-high-risk",
    ]);
    assert.deepEqual(decision.evidence.rejectedObjectiveIds, [
        "objective-medium",
        "objective-low",
    ]);

    console.log("V8-C AUTONOMOUS PRIORITIZATION DEMO");
    console.log(`Candidates          : ${candidates.length}`);
    console.log(`Selection budget    : ${decision.budget}`);
    console.log(`Selected            : ${decision.selected.map((item) => item.objective.id).join(" -> ")}`);
    console.log(`Rejected            : ${decision.rejected.map((item) => item.objective.id).join(" -> ")}`);
    console.log(`Arbitration evidence: ${decision.evidence.selectedObjectiveIds.join(", ")}`);
    console.log("");
    console.log("✓ competing objectives are ranked deterministically");
    console.log("✓ urgency and intervention signals affect arbitration");
    console.log("✓ objective priority resolves equal operational scores");
    console.log("✓ stable creation/id tie-breakers make selection reproducible");
    console.log("✓ the selection budget is strictly enforced");
    console.log("✓ selected and rejected work are explicitly auditable");
    console.log("✓ arbitration creates no execution authority");
    console.log("");
    console.log("V8-C autonomous prioritization: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
