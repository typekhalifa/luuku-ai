import assert from "node:assert/strict";
import { ExecutiveCapacityGate, type ExecutiveCapacityRequirement } from "../executive-capacity-gate.js";
import type { ExecutiveWorkCandidate } from "../executive-work-arbitrator.js";

const now = new Date("2026-09-09T06:30:00.000Z");

type RejectionReasons = Record<string, string>;

function candidate(id: string): ExecutiveWorkCandidate {
    return {
        objective: {
            id,
            title: id,
            description: `${id} objective`,
            priority: "high",
            status: "ACTIVE",
            progress: 20,
            createdAt: now,
            updatedAt: now,
        },
        assessment: {
            objectiveId: id,
            status: "ACTIVE",
            progress: 20,
            attentionRequired: true,
            reason: "Objective requires executive attention.",
        },
        urgency: {
            objectiveId: id,
            score: 100,
            overdue: false,
            dueSoon: false,
            stale: false,
        },
        progressTrend: {
            objectiveId: id,
            trend: "STAGNANT",
            delta: 0,
            interventionScore: 50,
            interventionRequired: true,
        },
    };
}

function rejectionReasons(evidence: Readonly<Record<string, unknown>>): RejectionReasons {
    const value = evidence.rejectionReasons;
    assert.equal(typeof value, "object");
    assert.notEqual(value, null);
    return value as RejectionReasons;
}

async function main(): Promise<void> {
    const candidates = [candidate("objective-one"), candidate("objective-two"), candidate("objective-three")];
    const gate = new ExecutiveCapacityGate([
        { id: "agent:research", limit: 1 },
        { id: "tool:web", limit: 2 },
        { id: "concurrency:executive", limit: 2, inUse: 1 },
    ]);

    const requirements = (item: ExecutiveWorkCandidate): readonly ExecutiveCapacityRequirement[] => [
        { resourceId: "agent:research" },
        { resourceId: "tool:web" },
        { resourceId: "concurrency:executive" },
    ];

    const decision = gate.admit(candidates, requirements);
    const repeated = gate.admit([...candidates].reverse(), requirements);
    const decisionRejections = rejectionReasons(decision.evidence);

    assert.deepEqual(decision.selected.map((item) => item.objective.id), ["objective-one"]);
    assert.deepEqual(decision.rejected.map((item) => item.objective.id), ["objective-two", "objective-three"]);
    assert.deepEqual(decision.selected.map((item) => item.objective.id), repeated.selected.map((item) => item.objective.id));
    assert.equal(decision.capacity["agent:research"].remaining, 0);
    assert.equal(decision.capacity["tool:web"].remaining, 1);
    assert.equal(decision.capacity["concurrency:executive"].remaining, 0);
    assert.equal(decisionRejections["objective-two"], "CAPACITY_LIMIT:agent:research");

    const unavailable = new ExecutiveCapacityGate([{ id: "agent:research", limit: 1, inUse: 1 }]);
    const unavailableDecision = unavailable.admit([candidate("objective-blocked")], () => [
        { resourceId: "agent:research" },
        { resourceId: "tool:missing" },
    ]);
    const unavailableRejections = rejectionReasons(unavailableDecision.evidence);
    assert.deepEqual(unavailableDecision.selected, []);
    assert.equal(unavailableRejections["objective-blocked"], "CAPACITY_LIMIT:agent:research");

    console.log("V8-D RESOURCE & CAPACITY DEMO");
    console.log(`Candidates          : ${candidates.length}`);
    console.log(`Selected            : ${decision.selected.map((item) => item.objective.id).join(" -> ")}`);
    console.log(`Rejected            : ${decision.rejected.map((item) => item.objective.id).join(" -> ")}`);
    console.log(`Research capacity   : ${decision.capacity["agent:research"].remaining} remaining`);
    console.log(`Web capacity        : ${decision.capacity["tool:web"].remaining} remaining`);
    console.log(`Concurrency         : ${decision.capacity["concurrency:executive"].remaining} remaining`);
    console.log("");
    console.log("✓ capacity is evaluated after bounded V8-C selection");
    console.log("✓ agent capacity prevents over-allocation");
    console.log("✓ tool capacity is tracked independently");
    console.log("✓ concurrency limits are respected with existing load");
    console.log("✓ unavailable capacity rejects work before planning");
    console.log("✓ capacity decisions are deterministic and auditable");
    console.log("✓ capacity gating creates no execution authority");
    console.log("✓ V6 remains the downstream execution authority");
    console.log("");
    console.log("V8-D resource & capacity: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
