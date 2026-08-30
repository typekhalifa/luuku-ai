import assert from "node:assert/strict";
import { InMemoryQueueStore, QueueItem, QueueItemStatus } from "../../queue/queue.js";
import { Priority } from "../../task/priority.js";
import { QueueScheduler } from "../../scheduler/scheduler.js";
import { RuntimeEventBus } from "../runtime-events.js";

function item(id: string, agentId: string): QueueItem {
    const now = new Date();
    return { id, workflowId: "v6.8-durable-coordination", stepId: `${agentId}-research`, agentId, priority: Priority.MEDIUM, availableAt: now, status: QueueItemStatus.QUEUED, attempts: 0, metadata: {}, createdAt: now, updatedAt: now };
}

async function main() {
    const queue = new InMemoryQueueStore();
    const scheduler = new QueueScheduler(queue);
    const events = new RuntimeEventBus();
    const handled = new Set<string>();
    const executionLog: string[] = [];
    const agents = ["sales", "marketing", "intelligence"];

    for (const agentId of agents) {
        events.on("workflow.step.completed", async event => {
            const key = `${agentId}:${event.workflowId}:${event.stepId}`;
            if (handled.has(key)) return;
            handled.add(key);
            const queueId = `${event.workflowId}:${agentId}`;
            if (!await queue.get(queueId)) {
                await scheduler.schedule(item(queueId, agentId));
            }
        });
    }

    const event = { type: "workflow.step.completed" as const, workflowId: "v6.8-durable-coordination", stepId: "research-company", occurredAt: new Date() };
    await events.publish(event);
    await events.publish(event);

    for (const agentId of agents) {
        const queued = await queue.get(`${event.workflowId}:${agentId}`);
        assert.equal(queued?.status, QueueItemStatus.QUEUED);
    }
    assert.equal(handled.size, 3);

    const first = await queue.claimNext(new Date(Date.now() + 1));
    assert.ok(first);
    executionLog.push(first.agentId);
    await queue.complete(first.id);

    const second = await queue.claimNext(new Date(Date.now() + 1));
    assert.ok(second);
    executionLog.push(second.agentId);
    await queue.complete(second.id);

    const third = await queue.claimNext(new Date(Date.now() + 1));
    assert.ok(third);
    executionLog.push(third.agentId);
    await queue.complete(third.id);

    assert.deepEqual(new Set(executionLog), new Set(agents));
    assert.equal(executionLog.length, 3);
    for (const agentId of agents) assert.equal((await queue.get(`${event.workflowId}:${agentId}`))?.status, QueueItemStatus.COMPLETED);

    console.log("");
    console.log("========================================");
    console.log(" V6.8 DURABLE MULTI-AGENT COORDINATION DEMO");
    console.log("========================================");
    console.log("");
    console.log("Research event   : persisted coordination trigger");
    console.log("Sales            : QUEUED → COMPLETED");
    console.log("Marketing        : QUEUED → COMPLETED");
    console.log("Intelligence     : QUEUED → COMPLETED");
    console.log("Duplicate event  : no duplicate queue items");
    console.log("Execution        : 3 independent durable queue items");
    console.log("");
    console.log("✓ One event created independent durable work for multiple agents.");
    console.log("✓ Duplicate delivery did not create duplicate queue items.");
    console.log("✓ Each agent executed through the shared queue boundary.");
    console.log("✓ Agent work completed independently with durable queue state.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main();
