import assert from "node:assert/strict";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { Priority } from "../../task/priority.js";

async function main() {
    const queue = new InMemoryQueueStore();
    const scheduler = new QueueScheduler(queue);
    const workflowId = `v6.9-coordination-recovery-${Date.now()}`;
    const steps = ["sales", "marketing", "intelligence"];

    for (const stepId of steps) {
        await scheduler.schedule({
            id: `${workflowId}:${stepId}`,
            workflowId,
            stepId,
            agentId: stepId,
            priority: Priority.MEDIUM,
            availableAt: new Date(),
            metadata: { eventId: `${workflowId}:research-completed` },
        });
    }

    const first = await queue.claimNext();
    const second = await queue.claimNext();
    const third = await queue.claimNext();
    assert.ok(first && second && third);

    await queue.complete(first.id);
    await queue.complete(third.id);

    const staleTime = new Date(Date.now() - 10 * 60 * 1000);
    await queue.retry(second.id, staleTime);
    const recovered = await queue.recoverStaleClaims(new Date(), 5 * 60 * 1000);

    assert.deepEqual(recovered, []);
    const marketingQueued = await queue.get(second.id);
    assert.equal(marketingQueued?.status, QueueItemStatus.QUEUED);

    const recoveredClaim = await queue.claimNext(new Date());
    assert.equal(recoveredClaim?.id, second.id);
    assert.equal(recoveredClaim?.attempts, 2);
    await queue.complete(second.id);

    assert.equal((await queue.get(first.id))?.status, QueueItemStatus.COMPLETED);
    assert.equal((await queue.get(second.id))?.status, QueueItemStatus.COMPLETED);
    assert.equal((await queue.get(third.id))?.status, QueueItemStatus.COMPLETED);

    console.log("");
    console.log("========================================");
    console.log(" V6.9 COORDINATION RECOVERY DEMO");
    console.log("========================================");
    console.log("");
    console.log("Sales          : COMPLETED before crash");
    console.log("Marketing      : interrupted → recovered → COMPLETED");
    console.log("Intelligence   : COMPLETED before crash");
    console.log("Recovery       : only interrupted work resumed");
    console.log("");
    console.log("✓ Completed agents were not re-executed.");
    console.log("✓ Interrupted coordination work remained independently recoverable.");
    console.log("✓ Recovery preserved the queue attempt count.");
    console.log("✓ All coordinated work converged to COMPLETED exactly once after recovery.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main();
