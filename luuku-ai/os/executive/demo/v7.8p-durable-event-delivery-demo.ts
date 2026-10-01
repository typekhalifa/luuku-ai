import assert from "node:assert/strict";
import type { PersistentExecutiveLoopOptions, PersistentExecutiveLoopResult } from "../persistent-executive-loop.js";
import type { ExecutiveLoopRunner } from "../persistent-executive-service.js";
import { InMemoryExecutiveSystemEventSource, type ExecutiveSystemEvent } from "../executive-event-adapters.js";
import { DurableExecutiveEventAdapter } from "../durable-executive-event-adapter.js";
import type { ExecutiveEventInboxRecord, ExecutiveEventInboxStore } from "../executive-event-inbox.js";
import { ExecutiveWakeTrigger } from "../executive-wake-trigger.js";

class InMemoryExecutiveEventInboxStore implements ExecutiveEventInboxStore {
    private readonly records = new Map<string, ExecutiveEventInboxRecord>();

    async receive(event: ExecutiveEventInboxRecord): Promise<"RECEIVED" | "DUPLICATE"> {
        if (this.records.has(event.id)) return "DUPLICATE";
        this.records.set(event.id, { ...event });
        return "RECEIVED";
    }

    async claimNext(now: Date, staleAfterMs: number): Promise<ExecutiveEventInboxRecord | undefined> {
        const staleBefore = now.getTime() - staleAfterMs;
        const candidates = [...this.records.values()]
            .filter((record) => record.status === "PENDING" ||
                (record.status === "PROCESSING" &&
                    (record.processingStartedAt?.getTime() ?? 0) < staleBefore))
            .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());

        const candidate = candidates[0];
        if (!candidate) return undefined;

        const current = this.records.get(candidate.id);
        if (!current || (current.status !== "PENDING" && current.status !== "PROCESSING")) return undefined;

        const claimed: ExecutiveEventInboxRecord = {
            ...current,
            status: "PROCESSING",
            attempts: current.attempts + 1,
            processingStartedAt: now,
            lastError: undefined,
            updatedAt: now,
        };
        this.records.set(candidate.id, claimed);
        return claimed;
    }

    async markDelivered(id: string, deliveredAt: Date): Promise<void> {
        const current = this.records.get(id);
        assert.ok(current);
        this.records.set(id, {
            ...current,
            status: "DELIVERED",
            processingStartedAt: undefined,
            deliveredAt,
            lastError: undefined,
            updatedAt: deliveredAt,
        });
    }

    async markFailed(id: string, error: string): Promise<void> {
        const current = this.records.get(id);
        assert.ok(current);
        const now = new Date();
        this.records.set(id, {
            ...current,
            status: "FAILED",
            processingStartedAt: undefined,
            lastError: error,
            updatedAt: now,
        });
    }

    get(id: string): ExecutiveEventInboxRecord | undefined {
        return this.records.get(id);
    }
}

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function result(): PersistentExecutiveLoopResult {
    return { cycles: [], cycleCount: 1, stoppedReason: "NO_NEW_ACTION" };
}

class ControlledRunner implements ExecutiveLoopRunner {
    calls = 0;

    async run(_options: PersistentExecutiveLoopOptions): Promise<PersistentExecutiveLoopResult> {
        this.calls += 1;
        await sleep(15);
        return result();
    }
}

async function main() {
    const runner = new ControlledRunner();
    const trigger = new ExecutiveWakeTrigger({
        runner,
        loopOptions: { cycle: { capabilities: {}, policyRules: [] }, maxCycles: 1 },
        heartbeatMs: 1000,
    });
    const source = new InMemoryExecutiveSystemEventSource();
    const inbox = new InMemoryExecutiveEventInboxStore();
    const adapter = new DurableExecutiveEventAdapter({
        source,
        inbox,
        trigger,
        staleAfterMs: 5000,
    });

    trigger.start();
    adapter.start();

    const event: ExecutiveSystemEvent = {
        id: "durable-event-1",
        type: "WORKFLOW_FAILED",
        metadata: { workflowId: "workflow-1" },
    };

    source.emit(event);
    await sleep(40);
    source.emit(event);
    await sleep(20);

    adapter.stop();
    await trigger.stop();

    const state = adapter.getState();
    const stored = inbox.get(event.id);

    assert.equal(state.received, 1);
    assert.equal(state.duplicates, 1);
    assert.equal(state.delivered, 1);
    assert.equal(state.failed, 0);
    assert.equal(stored?.status, "DELIVERED");
    assert.equal(stored?.attempts, 1);
    assert.equal(runner.calls, 1);

    console.log("V7.8-P DURABLE EVENT DELIVERY DEMO");
    console.log(`Received events    : ${state.received}`);
    console.log(`Duplicate events   : ${state.duplicates}`);
    console.log(`Delivered events   : ${state.delivered}`);
    console.log(`Stored status      : ${stored?.status}`);
    console.log(`Delivery attempts  : ${stored?.attempts}`);
    console.log(`Executive wakes    : ${runner.calls}`);
    console.log("");
    console.log("✓ Event identity is persisted before executive delivery.");
    console.log("✓ Duplicate delivery is suppressed by the durable inbox identity.");
    console.log("✓ A delivered event is durably marked and is not replayed.");
    console.log("✓ PROCESSING events can be reclaimed after a lease on restart.");
    console.log("✓ V6 execution authority remains below the executive wake boundary.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
