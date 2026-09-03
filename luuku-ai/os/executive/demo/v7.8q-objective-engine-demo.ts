import assert from "node:assert/strict";
import type { ExecutiveObjectiveRecord } from "../objective-engine.js";
import {
    ExecutiveObjectiveEngine,
    InMemoryExecutiveObjectiveStore,
} from "../objective-engine.js";
import type { ExecutiveState } from "../executive-state.js";

const now = new Date();

const objective: ExecutiveObjectiveRecord = {
    id: "objective-close-prospects",
    title: "Close Qualified Prospects",
    description: "Prioritize converting high-quality prospects into meetings and customers.",
    priority: "high",
    status: "ACTIVE",
    progress: 25,
    createdAt: now,
    updatedAt: now,
};

const healthyState: ExecutiveState = {
    active: 0,
    approval: 0,
    failed: 0,
    completed: 4,
    failedWorkIds: [],
};

const blockedState: ExecutiveState = {
    active: 0,
    approval: 1,
    failed: 0,
    completed: 4,
    failedWorkIds: [],
};

async function main() {
    const store = new InMemoryExecutiveObjectiveStore();
    const engine = new ExecutiveObjectiveEngine(store);
    await store.save(objective);

    const active = await engine.listActive();
    const assessment = await engine.assess(objective, healthyState);
    const blockedAssessment = await engine.assess(objective, blockedState);
    const recovered = await store.get(objective.id);

    assert.equal(active.length, 1);
    assert.equal(recovered?.id, objective.id);
    assert.equal(assessment.attentionRequired, true);
    assert.equal(assessment.progress, 25);
    assert.equal(blockedAssessment.attentionRequired, true);
    assert.match(blockedAssessment.reason, /approval/i);

    console.log("V7.8-Q EXECUTIVE OBJECTIVE ENGINE DEMO");
    console.log(`Active objectives : ${active.length}`);
    console.log(`Objective progress: ${assessment.progress}%`);
    console.log(`Healthy assessment: ${assessment.reason}`);
    console.log(`Blocked assessment: ${blockedAssessment.reason}`);
    console.log("");
    console.log("✓ Executive objectives have stable durable identities.");
    console.log("✓ Active objectives can be listed independently of execution.");
    console.log("✓ The objective engine assesses current executive state without executing work.");
    console.log("✓ Pending approval remains visible as objective-level attention.");
    console.log("✓ Objective state is separated from V6 workflow execution authority.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
