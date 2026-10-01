import assert from "node:assert/strict";

import { prisma } from "../../../shared/database/client";
import { Priority } from "../../task/priority";
import { PrismaQueueStore } from "../prisma-queue-store";
import { QueueItem, QueueItemStatus } from "../queue";

const itemId = "v6-prisma-queue-persistence-demo";
const now = new Date("2026-08-29T10:00:00.000Z");

const item: QueueItem = {
    id: itemId,
    workflowId: "v6-workflow-persistence-demo",
    stepId: "research-company",
    agentId: "research-agent",
    priority: Priority.HIGH,
    availableAt: now,
    status: QueueItemStatus.QUEUED,
    attempts: 0,
    metadata: { source: "v6-prisma-queue-persistence-demo" },
    createdAt: now,
    updatedAt: now,
};

async function main() {
    const store = new PrismaQueueStore();

    await prisma.queueItem.deleteMany({ where: { id: itemId } });

    await store.enqueue(item);

    const loaded = await new PrismaQueueStore().get(itemId);
    assert.equal(loaded?.status, QueueItemStatus.QUEUED);
    assert.equal(loaded?.attempts, 0);
    assert.equal(loaded?.workflowId, item.workflowId);

    const claimed = await new PrismaQueueStore().claimNext(now);
    assert.equal(claimed?.id, itemId);
    assert.equal(claimed?.status, QueueItemStatus.CLAIMED);
    assert.equal(claimed?.attempts, 1);

    const afterClaim = await new PrismaQueueStore().get(itemId);
    assert.equal(afterClaim?.status, QueueItemStatus.CLAIMED);
    assert.equal(afterClaim?.attempts, 1);

    await new PrismaQueueStore().complete(itemId, new Date("2026-08-29T10:01:00.000Z"));

    const completed = await new PrismaQueueStore().get(itemId);
    assert.equal(completed?.status, QueueItemStatus.COMPLETED);
    assert.equal(completed?.attempts, 1);
    assert.equal(completed?.workflowId, item.workflowId);
    assert.deepEqual(completed?.metadata, item.metadata);

    console.log("");
    console.log("========================================");
    console.log("     V6 PRISMA QUEUE PERSISTENCE DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Queue item : ${completed?.id}`);
    console.log(`Status     : ${completed?.status}`);
    console.log(`Attempts   : ${completed?.attempts}`);
    console.log(`Workflow   : ${completed?.workflowId}`);
    console.log("");
    console.log("✓ Queue work was written to PostgreSQL.");
    console.log("✓ A fresh queue store recovered queued work.");
    console.log("✓ Claim state and attempt count were persisted.");
    console.log("✓ Completion state was persisted and recovered.");
    console.log("✓ V6 queue state survives beyond the original store instance.");
    console.log("");

    await prisma.queueItem.delete({ where: { id: itemId } });
}

main().catch(async (error) => {
    console.error(error);
    await prisma.queueItem.deleteMany({ where: { id: itemId } }).catch(() => undefined);
    process.exitCode = 1;
});
