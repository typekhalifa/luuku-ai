import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../../orchestration/ownership.js";
import { InMemoryExecutiveLoopCheckpointStore } from "../executive-loop-checkpoint.js";
import { DurableExecutiveEventAdapter } from "../durable-executive-event-adapter.js";
import type { ExecutiveEventInboxRecord, ExecutiveEventInboxStore } from "../executive-event-inbox.js";

const companyA = { scope: "COMPANY" as const, companyId: "company-a" };
const companyB = { scope: "COMPANY" as const, companyId: "company-b" };
const now = new Date("2026-09-25T21:00:00.000Z");

const checkpointA = new InMemoryExecutiveLoopCheckpointStore(companyA);
const checkpointB = new InMemoryExecutiveLoopCheckpointStore(companyB);

await checkpointA.save({
    version: 1,
    ownership: companyA,
    handledIntentKeys: ["intent-a"],
    cycleCount: 1,
    updatedAt: now,
});

if ((await checkpointA.load()).handledIntentKeys[0] !== "intent-a") {
    throw new Error("Company A checkpoint was not persisted.");
}
if ((await checkpointB.load()).handledIntentKeys.length !== 0) {
    throw new Error("Company B can see Company A checkpoint state.");
}

await expectOwnershipFailure(
    () => checkpointB.save({
        version: 1,
        ownership: companyA,
        handledIntentKeys: ["cross-tenant"],
        cycleCount: 2,
        updatedAt: now,
    }),
    "checkpoint",
);

const inboxA = new ScopedInMemoryEventInboxStore(companyA);
const inboxB = new ScopedInMemoryEventInboxStore(companyB);

const trigger = { wake: async () => ({ cycles: [], cycleCount: 0, stoppedReason: "NO_NEW_ACTION" as const }) };
const adapterA = new DurableExecutiveEventAdapter({
    source: { subscribe: () => () => undefined },
    inbox: inboxA,
    trigger,
    staleAfterMs: 1_000,
    now: () => now,
});
const adapterB = new DurableExecutiveEventAdapter({
    source: { subscribe: () => () => undefined },
    inbox: inboxB,
    trigger,
    staleAfterMs: 1_000,
    now: () => now,
});

const eventA = {
    id: "event-a",
    ownership: companyA,
    type: "STATE_CHANGED" as const,
    occurredAt: now,
};

if (await adapterA.accept(eventA) !== "RECEIVED") {
    throw new Error("Company A event was not received.");
}
if (await inboxA.claimNext(now, 1_000) === undefined) {
    throw new Error("Company A event was not claimable.");
}
if (await inboxB.claimNext(now, 1_000) !== undefined) {
    throw new Error("Company B can see Company A event.");
}

await expectOwnershipFailure(
    () => adapterB.accept(eventA).then(() => undefined),
    "event",
);

console.log("V8 Executive checkpoint + event ownership isolation validation");
console.log("✓ Company A checkpoint state is isolated from Company B.");
console.log("✓ Company B cannot write Company A checkpoint state.");
console.log("✓ Company A events are claimable only through Company A ownership.");
console.log("✓ Company B cannot claim Company A events.");
console.log("✓ Company B cannot receive Company A events.");
console.log("EXECUTIVE CHECKPOINT + EVENT ISOLATION: PASS");

class ScopedInMemoryEventInboxStore implements ExecutiveEventInboxStore {
    private readonly events = new Map<string, ExecutiveEventInboxRecord>();

    constructor(private readonly ownership: ExecutionOwnership) {}

    async receive(event: ExecutiveEventInboxRecord): Promise<"RECEIVED" | "DUPLICATE"> {
        const eventOwnership = normalizeExecutionOwnership(event.ownership);
        if (!ownershipMatches(this.ownership, eventOwnership)) {
            throw new Error("Executive event inbox ownership mismatch.");
        }
        if (this.events.has(event.id)) return "DUPLICATE";
        this.events.set(event.id, structuredClone({ ...event, ownership: eventOwnership }));
        return "RECEIVED";
    }

    async claimNext(): Promise<ExecutiveEventInboxRecord | undefined> {
        const pending = [...this.events.values()].find((event) =>
            ownershipMatches(this.ownership, event.ownership) && event.status === "PENDING"
        );
        if (!pending) return undefined;
        const claimed = {
            ...pending,
            status: "PROCESSING" as const,
            attempts: pending.attempts + 1,
            processingStartedAt: now,
            updatedAt: now,
        };
        this.events.set(claimed.id, claimed);
        return structuredClone(claimed);
    }

    async markDelivered(id: string, deliveredAt: Date): Promise<void> {
        const event = this.events.get(id);
        if (!event || !ownershipMatches(this.ownership, event.ownership)) {
            throw new Error("Executive event inbox ownership mismatch.");
        }
        this.events.set(id, {
            ...event,
            status: "DELIVERED",
            deliveredAt,
            processingStartedAt: undefined,
            updatedAt: deliveredAt,
        });
    }

    async markFailed(id: string, error: string): Promise<void> {
        const event = this.events.get(id);
        if (!event || !ownershipMatches(this.ownership, event.ownership)) {
            throw new Error("Executive event inbox ownership mismatch.");
        }
        this.events.set(id, {
            ...event,
            status: "FAILED",
            lastError: error,
            processingStartedAt: undefined,
            updatedAt: now,
        });
    }
}

async function expectOwnershipFailure(
    operation: () => Promise<void>,
    label: string,
): Promise<void> {
    try {
        await operation();
    } catch (error) {
        if (error instanceof Error && error.message.toLowerCase().includes("ownership mismatch")) return;
        throw error;
    }

    throw new Error(`Expected ${label} ownership mismatch to be rejected.`);
}
