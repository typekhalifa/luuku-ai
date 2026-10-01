import assert from "node:assert/strict";
import { PrismaExecutiveLoopCheckpointStore } from "../prisma-executive-loop-checkpoint-store";
import { prisma } from "../../../shared/database/client";

async function main() {
    const firstStore = new PrismaExecutiveLoopCheckpointStore();
    const intentKey = `RECOVER_FAILED_WORK:{"failedWorkIds":["durable-restart-${Date.now()}"]}`;

    await firstStore.save({
        version: 1,
        handledIntentKeys: [intentKey],
        cycleCount: 7,
        updatedAt: new Date(),
    });

    // Simulate a process restart: the second store has no in-memory state from the first instance.
    const secondStore = new PrismaExecutiveLoopCheckpointStore();
    const recovered = await secondStore.load();

    assert.equal(recovered.version, 1);
    assert.equal(recovered.cycleCount, 7);
    assert.deepEqual(recovered.handledIntentKeys, [intentKey]);

    await prisma.executiveLoopCheckpoint.delete({ where: { id: "executive-loop" } });

    console.log("V7.8-L DURABLE EXECUTIVE CHECKPOINT DEMO");
    console.log(`Persisted intent  : ${intentKey}`);
    console.log(`Recovered intent  : ${recovered.handledIntentKeys[0]}`);
    console.log(`Cycle count      : ${recovered.cycleCount}`);
    console.log("Process restart  : simulated");
    console.log("");
    console.log("✓ Checkpoint state is stored in PostgreSQL, not process memory.");
    console.log("✓ A fresh checkpoint-store instance recovers handled intent identity.");
    console.log("✓ Cycle count survives store/process recreation.");
    console.log("✓ The checkpoint is removed after the verification run.");
    console.log("✓ No external provider or network request was used.");
}

main()
    .catch(async (error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
