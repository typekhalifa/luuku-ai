import assert from "node:assert/strict";

import { prisma } from "../../../shared/database/client.js";
import { Priority } from "../../task/priority.js";
import { PrismaQueueStore } from "../../queue/prisma-queue-store.js";
import { QueueItemStatus } from "../../queue/queue.js";

async function main() {
    const queue = new PrismaQueueStore();
    const workflowId = `v6.9-prisma-concurrent-claim-${Date.now()}`;
    const queueId = `${workflowId}:marketing`;
    const now = new Date();

    await prisma.queueItem.deleteMany({ where: { workflowId } });
    await prisma.queueItem.create({
        data: {
            id: queueId, workflowId, stepId: "marketing", agentId: "marketing", priority: Priority.HIGH,
            availableAt: now, status: QueueItemStatus.QUEUED, attempts: 0, metadata: {}, createdAt: now, updatedAt: now,
        },
    });

    const [workerA, workerB] = await Promise.all([queue.claimNext(now), queue.claimNext(now)]);
    const winners = [workerA, workerB].filter((item): item is NonNullable<typeof item> => item !== null);
    assert.equal(winners.length, 1);
    assert.equal(winners[0].id, queueId);
    assert.equal(winners[0].attempts, 1);

    const persisted = await queue.get(queueId);
    assert.equal(persisted?.status, QueueItemStatus.CLAIMED);
    assert.equal(persisted?.attempts, 1);

    await queue.complete(queueId, now);
    const [workerC, workerD] = await Promise.all([
        queue.claimNext(new Date(now.getTime() + 1_000)), queue.claimNext(new Date(now.getTime() + 1_000)),
    ]);
    assert.equal(workerC, null);
    assert.equal(workerD, null);

    console.log("");
    console.log("========================================");
    console.log(" V6.9 PRISMA CONCURRENT CLAIM SAFETY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Worker A/B    : concurrent claim race");
    console.log("Claim winner  : exactly 1 worker");
    console.log("Attempts      : 1");
    console.log("After complete: no duplicate claim");
    console.log("");
    console.log("✓ PostgreSQL-backed claim uses a guarded state transition.");
    console.log("✓ Concurrent workers cannot both own the same QUEUED item.");
    console.log("✓ Attempt count increments exactly once for the winning claim.");
    console.log("✓ COMPLETED work cannot be claimed again.");
    console.log("✓ No external provider or network request was used.");
    console.log("");

    await prisma.queueItem.deleteMany({ where: { workflowId } });
}

main().catch(async (error) => {
    console.error(error);
    process.exitCode = 1;
});
