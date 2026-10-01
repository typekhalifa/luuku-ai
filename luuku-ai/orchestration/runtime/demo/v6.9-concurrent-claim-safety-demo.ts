import assert from "node:assert/strict";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { Priority } from "../../task/priority.js";

async function main() {
    const queue = new InMemoryQueueStore();
    const scheduler = new QueueScheduler(queue);
    const workflowId = `v6.9-concurrent-claim-${Date.now()}`;

    await scheduler.schedule({
        id: `${workflowId}:marketing`, workflowId, stepId: "marketing", agentId: "marketing",
        priority: Priority.HIGH, availableAt: new Date(), metadata: {},
    });

    const [workerA, workerB] = await Promise.all([queue.claimNext(), queue.claimNext()]);
    assert.ok(workerA);
    assert.equal(workerB, null);
    assert.equal(workerA.attempts, 1);
    assert.equal((await queue.get(workerA.id))?.status, QueueItemStatus.CLAIMED);

    await queue.complete(workerA.id);
    const [workerCAfterCompletion, workerDAfterCompletion] = await Promise.all([queue.claimNext(), queue.claimNext()]);
    assert.equal(workerCAfterCompletion, null);
    assert.equal(workerDAfterCompletion, null);

    console.log("");
    console.log("========================================");
    console.log(" V6.9 CONCURRENT CLAIM SAFETY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Worker A       : CLAIMED → COMPLETED");
    console.log("Worker B       : could not claim the same item");
    console.log("Workers C + D  : no duplicate work after completion");
    console.log("");
    console.log("✓ Concurrent claim attempts yielded one owner.");
    console.log("✓ A queue item cannot be claimed twice while CLAIMED.");
    console.log("✓ Completion prevents subsequent duplicate claims.");
    console.log("✓ Claim semantics preserve exactly-once ownership at the queue boundary.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main();
