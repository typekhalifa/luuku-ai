import { prisma } from "../../../shared/database/client";
import type { ExecutiveMemoryRecord } from "../executive-memory";
import { PrismaExecutiveMemoryStore } from "../prisma-executive-memory-store";

function assert(condition: boolean, message: string): void {
    if (!condition) throw new Error(`Assertion failed: ${message}`);
    console.log(`✓ ${message}`);
}

async function main(): Promise<void> {
    const store = new PrismaExecutiveMemoryStore();
    await prisma.executiveMemory.deleteMany({
        where: { id: { startsWith: "v7.8af-demo:" } },
    });

    const first: ExecutiveMemoryRecord = {
        id: "v7.8af-demo:first",
        objectiveId: "objective-durable-memory",
        workflowId: "workflow-durable-memory",
        eventType: "ACTION_FAILED",
        action: "provider-sync",
        outcome: "Provider timed out.",
        success: false,
        lesson: "Use bounded retries and an alternate provider path.",
        confidence: 0,
        createdAt: new Date("2026-09-05T08:00:00.000Z"),
    };

    const second: ExecutiveMemoryRecord = {
        id: "v7.8af-demo:second",
        objectiveId: "objective-durable-memory",
        workflowId: "workflow-durable-memory-2",
        eventType: "ACTION_COMPLETED",
        action: "qualified-prospect-research",
        outcome: "Research completed.",
        success: true,
        confidence: 1,
        createdAt: new Date("2026-09-05T08:01:00.000Z"),
    };

    await store.save(first);
    await store.save(second);

    const beforeRestart = await store.list();
    assert(beforeRestart.length === 2, "two records persisted");
    assert(beforeRestart[0]?.id === first.id, "records are ordered by creation time");

    const restartedStore = new PrismaExecutiveMemoryStore();
    const afterRestart = await restartedStore.list();
    assert(afterRestart.length === 2, "records survive a new store instance");
    assert(afterRestart.some((record) => record.id === first.id), "failed outcome survives restart");
    assert(afterRestart.some((record) => record.id === second.id), "successful outcome survives restart");
    assert(afterRestart.find((record) => record.id === first.id)?.objectiveId === first.objectiveId, "objective linkage persists");
    assert(afterRestart.find((record) => record.id === first.id)?.lesson === first.lesson, "lesson persists");

    let duplicateRejected = false;
    try {
        await restartedStore.save(first);
    } catch {
        duplicateRejected = true;
    }
    assert(duplicateRejected, "duplicate memory IDs are rejected");

    let invalidConfidenceRejected = false;
    try {
        await restartedStore.save({
            ...first,
            id: "v7.8af-demo:invalid-confidence",
            confidence: 1.5,
        });
    } catch {
        invalidConfidenceRejected = true;
    }
    assert(invalidConfidenceRejected, "invalid confidence is rejected");

    const finalRecords = await restartedStore.list();
    console.log(`Durable records     : ${finalRecords.length}`);
    console.log(`First action        : ${finalRecords[0]?.action}`);
    console.log(`Second action       : ${finalRecords[1]?.action}`);
    console.log(`Restart persistence : ${finalRecords.length === 2 ? "PASS" : "FAIL"}`);

    await prisma.executiveMemory.deleteMany({
        where: { id: { startsWith: "v7.8af-demo:" } },
    });
}

main().catch(async (error) => {
    console.error(error);
    await prisma.executiveMemory.deleteMany({
        where: { id: { startsWith: "v7.8af-demo:" } },
    }).catch(() => undefined);
    process.exitCode = 1;
});
