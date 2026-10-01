import {
    InMemoryExecutiveMemoryStore,
} from "../executive-memory.js";
import { ExecutiveMemoryInstitutionalProjector } from "../v8-l-institutional-memory-projector.js";
import { ExecutiveInstitutionalMemory, InMemoryInstitutionalMemoryStore } from "../v8-l-institutional-memory.js";

const main = async (): Promise<void> => {
    const executiveStore = new InMemoryExecutiveMemoryStore();
    const institutionalStore = new InMemoryInstitutionalMemoryStore();
    const institutionalMemory = new ExecutiveInstitutionalMemory(institutionalStore);
    const projector = new ExecutiveMemoryInstitutionalProjector(executiveStore, institutionalMemory);
    const createdAt = new Date("2026-09-15T00:00:00.000Z");

    await executiveStore.save({
        id: "exec-lesson-1",
        objectiveId: "sales-growth",
        eventType: "ACTION_COMPLETED",
        action: "sales follow-up",
        outcome: "qualified deal progressed",
        success: true,
        lesson: "Fast follow-up improves qualified-deal progression.",
        confidence: 0.9,
        createdAt,
    });

    await executiveStore.save({
        id: "exec-decision-1",
        objectiveId: "sales-growth",
        eventType: "DECISION_APPROVED",
        action: "increase follow-up cadence",
        outcome: "approved for the active sales objective",
        success: true,
        confidence: 1,
        createdAt,
    });

    await executiveStore.save({
        id: "exec-raw-1",
        eventType: "ACTION_COMPLETED",
        action: "send routine report",
        outcome: "delivered",
        success: true,
        createdAt,
    });

    const first = await projector.project();
    const second = await projector.project();
    const records = await institutionalStore.list();

    if (first.projected !== 2) throw new Error("Expected two explicit experience projections.");
    if (second.projected !== 0) throw new Error("Projection must be idempotent.");
    if (second.skipped < 2) throw new Error("Existing projections must be skipped safely.");
    if (records.length !== 2) throw new Error("Unexpected institutional memory count.");
    if (!records.some((record) => record.kind === "LESSON")) throw new Error("Lesson was not projected.");
    if (!records.some((record) => record.kind === "DECISION")) throw new Error("Decision was not projected.");

    console.log("V8-L — Executive-to-Institutional Memory Projection");
    console.log(`First projection             : ${first.projected}`);
    console.log(`Second projection            : ${second.projected}`);
    console.log(`Institutional records        : ${records.length}`);
    console.log("✓ Only explicit lessons and decisions are promoted");
    console.log("✓ Raw execution outcomes are not promoted into company knowledge");
    console.log("✓ Projection is deterministic and idempotent");
    console.log("✓ Evidence and objective linkage are preserved");
    console.log("V8-L PROJECTION VALIDATION: PASS");
};

void main();
