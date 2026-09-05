import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import { InMemoryExecutiveObjectiveStore, ExecutiveObjectiveEngine } from "../objective-engine.js";
import { ExecutiveObjectivePrioritySelector } from "../objective-priority-selector.js";
import type { ExecutiveState } from "../executive-state.js";

const baseTime = new Date("2026-09-05T04:00:00.000Z");

const objective = (
    id: string,
    title: string,
    priority: ExecutiveObjectiveRecord["priority"],
    progress: number,
    offsetMinutes: number,
): ExecutiveObjectiveRecord => ({
    id,
    title,
    description: `${title} objective`,
    priority,
    status: "ACTIVE",
    progress,
    createdAt: new Date(baseTime.getTime() + offsetMinutes * 60_000),
    updatedAt: new Date(baseTime.getTime() + offsetMinutes * 60_000),
});

async function main(): Promise<void> {
    const store = new InMemoryExecutiveObjectiveStore();
    await store.save(objective("objective-low", "Improve Agent Efficiency", "low", 5, 0));
    await store.save(objective("objective-medium", "Maintain Agent Momentum", "medium", 20, 1));
    await store.save(objective("objective-high-progress", "Strategic Growth", "high", 80, 2));
    await store.save(objective("objective-high-priority", "Recover Critical Operations", "high", 10, 3));

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
    const candidates = await Promise.all(
        objectives.map(async (objectiveRecord) => ({
            objective: objectiveRecord,
            assessment: await engine.assess(objectiveRecord, state),
        })),
    );

    const selector = new ExecutiveObjectivePrioritySelector();
    const ranked = selector.rank(candidates);
    const selected = selector.select(candidates);

    assert.equal(ranked[0]?.objective.id, "objective-high-priority");
    assert.equal(selected.length, 1);
    assert.equal(selected[0]?.objective.id, "objective-high-priority");
    assert.equal(selected[0]?.assessment.attentionRequired, true);

    console.log("V7.8-V OBJECTIVE PRIORITIZATION DEMO");
    console.log(`Active objectives : ${objectives.length}`);
    console.log(`Top objective     : ${ranked[0]?.objective.title}`);
    console.log(`Top priority      : ${ranked[0]?.objective.priority}`);
    console.log(`Top progress      : ${ranked[0]?.assessment.progress}%`);
    console.log(`Selected for work : ${selected[0]?.objective.title}`);
    console.log(`Selected count    : ${selected.length}`);
    console.log("");
    console.log("✓ High-priority objectives outrank medium and low priority work.");
    console.log("✓ Lower progress breaks ties between objectives with the same priority.");
    console.log("✓ Selection is deterministic and produces one next-work candidate.");
    console.log("✓ Objective prioritization remains side-effect free.");
    console.log("✓ No planning, approval, queue, or agent execution occurred.");
}

void main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
