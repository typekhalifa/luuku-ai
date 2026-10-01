import assert from "node:assert/strict";

import { prisma } from "../../../shared/database/client";
import { Priority } from "../../task/priority";
import { PrismaQueueStore } from "../prisma-queue-store";
import { QueueItem, QueueItemStatus } from "../queue";

const queueItemId = "v6-prisma-queue-recovery-demo";
const now = new Date("2026-08-29T10:00:00.000Z");

const item: QueueItem = {
    id: queueItemId,
    workflowId: "v6-persistent-workflow",
    stepId: "research-company",
    agentId: "research-agent",
    priority: Priority.HIGH,
    availableAt: now,
    status: QueueItemStatus.QUEUED,
    attempts: 0,
    metadata: { source: "v6-prisma-queue-recovery-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const firstStore = new PrismaQueueStore();

    await prisma.queueItem.deleteMany({ where: { id: queueItemId } });

    await firstStore.enqueue(item);

    const afterEnqueue = await new PrismaQueueStore().get(queueItemId);
    assert.equal(afterEnqueue?.status, QueueItemStatus.QUEUED);
    assert.equal(afterEnqueue?.attempts, 0);
    assert.equal(afterEnqueue?.workflowId, item.workflowId);
    assert.deepEqual(afterEnqueue?.metadata, item.metadata);

    const claimed = await new PrismaQueueStore().claimNext(now);
    assert.equal(claimed?.id, queueItemId);
    assert.equal(claimed?.status, QueueItemStatus.CLAIMED);
    assert.equal(claimed?.attempts, 1);

    const afterClaim = await new PrismaQueueStore().get(queueItemId);
    assert.equal(afterClaim?.status, QueueItemStatus.CLAIMED);
    assert.equal(afterClaim?.attempts, 1);

    await new PrismaQueueStore().complete(queueItemId, new Date("2026-08-29T10:01:00.000Z"));

    const recovered = await new PrismaQueueStore().get(queueItemId);
    assert.equal(recovered?.status, QueueItemStatus.COMPLETED);
    assert.equal(recovered?.attempts, 1);
    assert.equal(recovered?.workflowId, item.workflowId);
    assert.equal(recovered?.stepId, item.stepId);

    console.log("");
    console.log("========================================");
    console.log("     V6 PRISMA QUEUE RECOVERY DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Queue item : ${recovered?.id}`);
    console.log(`Workflow   : ${recovered?.workflowId}`);
    console.log(`Step       : ${recovered?.stepId}`);
    console.log(`Attempts   : ${recovered?.attempts}`);
    console.log(`Final state: ${recovered?.status}`);
    console.log("");
    console.log("✓ Queue work was written to PostgreSQL.");
    console.log("✓ A fresh queue store recovered queued work.");
    console.log("✓ Claiming persisted CLAIMED state and incremented attempts.");
    console.log("✓ A fresh queue store recovered the claimed state.");
    console.log("✓ Completion persisted across another store boundary.");
    console.log("✓ V6 queue state survives runtime-instance boundaries.");
    console.log("");

    await prisma.queueItem.delete({ where: { id: queueItemId } });
}

main().catch(async (error) => {
    console.error(error);
    await prisma.queueItem.deleteMany({ where: { id: queueItemId } }).catch(() => undefined);
    process.exitCode = 1;
});
