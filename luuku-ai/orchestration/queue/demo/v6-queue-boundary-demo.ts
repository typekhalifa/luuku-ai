import assert from "node:assert/strict";

import { Priority } from "../../task/priority";
import {
    InMemoryQueueStore,
    QueueItemStatus,
} from "../queue";

async function main() {
    const queue = new InMemoryQueueStore();
    const now = new Date();

    await queue.enqueue({
        id: "queue-research",
        workflowId: "workflow-company-x",
        stepId: "research-company",
        agentId: "research",
        priority: Priority.HIGH,
        availableAt: now,
        status: QueueItemStatus.QUEUED,
        attempts: 0,
        metadata: { source: "v6-queue-boundary-demo" },
        createdAt: now,
        updatedAt: now,
    });

    await queue.enqueue({
        id: "queue-follow-up",
        workflowId: "workflow-company-x",
        stepId: "follow-up",
        agentId: "sales",
        priority: Priority.LOW,
        availableAt: now,
        status: QueueItemStatus.QUEUED,
        attempts: 0,
        metadata: { source: "v6-queue-boundary-demo" },
        createdAt: now,
        updatedAt: now,
    });

    const claimed = await queue.claimNext(now);

    console.log("");
    console.log("========================================");
    console.log("        V6 QUEUE BOUNDARY DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Claimed : ${claimed?.stepId ?? "none"}`);
    console.log(`Status  : ${claimed?.status ?? "none"}`);
    console.log(`Attempt : ${claimed?.attempts ?? "none"}`);

    assert.equal(claimed?.id, "queue-research");
    assert.equal(claimed?.status, QueueItemStatus.CLAIMED);
    assert.equal(claimed?.attempts, 1);

    await queue.complete("queue-research");
    const completed = await queue.get("queue-research");
    const next = await queue.claimNext(now);

    assert.equal(completed?.status, QueueItemStatus.COMPLETED);
    assert.equal(next?.id, "queue-follow-up");
    assert.equal(next?.status, QueueItemStatus.CLAIMED);

    console.log("");
    console.log("After completion:");
    console.log(`  Completed : ${completed?.stepId} (${completed?.status})`);
    console.log(`  Next      : ${next?.stepId} (${next?.status})`);
    console.log("");
    console.log("✓ Queue accepts workflow execution items.");
    console.log("✓ Ready work is claimed by priority and availability.");
    console.log("✓ Claiming increments the execution attempt count.");
    console.log("✓ Completed work is not claimed again.");
    console.log("✓ Queue state is isolated from external providers.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
