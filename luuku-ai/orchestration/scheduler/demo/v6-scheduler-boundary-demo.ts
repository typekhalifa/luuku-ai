import assert from "node:assert/strict";

import { Priority } from "../../task/priority";
import { InMemoryQueueStore, QueueItemStatus } from "../../queue/queue";
import { QueueScheduler } from "../scheduler";

async function main() {
    const queue = new InMemoryQueueStore();
    const scheduler = new QueueScheduler(queue);
    const availableAt = new Date("2026-08-27T10:00:00.000Z");

    const item = await scheduler.schedule({
        id: "v6-scheduled-follow-up",
        workflowId: "workflow-company-x",
        stepId: "follow-up",
        agentId: "sales",
        availableAt,
        priority: Priority.HIGH,
        metadata: { source: "v6-scheduler-boundary-demo" },
    });

    assert.equal(item.status, QueueItemStatus.QUEUED);
    assert.equal(item.attempts, 0);
    assert.equal(item.availableAt.toISOString(), availableAt.toISOString());

    const beforeDue = await queue.claimNext(new Date("2026-08-27T09:59:59.000Z"));
    assert.equal(beforeDue, null);

    const due = await queue.claimNext(availableAt);
    assert.equal(due?.id, item.id);
    assert.equal(due?.status, QueueItemStatus.CLAIMED);
    assert.equal(due?.attempts, 1);

    console.log("");
    console.log("========================================");
    console.log("        V6 SCHEDULER BOUNDARY DEMO");
    console.log("========================================");
    console.log("");
    console.log(`Scheduled : ${item.id}`);
    console.log(`Status    : ${item.status}`);
    console.log(`Available : ${item.availableAt.toISOString()}`);
    console.log("Before due: not claimable");
    console.log(`At due    : ${due?.id ?? "none"}`);
    console.log("");
    console.log("✓ Scheduler creates queue work without executing it.");
    console.log("✓ Work remains unavailable until its scheduled time.");
    console.log("✓ Queue claims the work when it becomes due.");
    console.log("✓ Scheduler is isolated from agent execution and external providers.");
    console.log("");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
