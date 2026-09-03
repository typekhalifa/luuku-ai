import type { ExecutiveWakeEvent, ExecutiveWakeTrigger } from "./executive-wake-trigger.js";
import type {
    ExecutiveEventInboxRecord,
    ExecutiveEventInboxStore,
} from "./executive-event-inbox.js";
import type { ExecutiveSystemEvent, ExecutiveSystemEventSource } from "./executive-event-adapters.js";

export interface DurableExecutiveEventAdapterOptions {
    readonly source: ExecutiveSystemEventSource;
    readonly inbox: ExecutiveEventInboxStore;
    readonly trigger: Pick<ExecutiveWakeTrigger, "wake">;
    /** Reclaims PROCESSING events after this lease expires. */
    readonly staleAfterMs: number;
    readonly now?: () => Date;
    readonly onError?: (error: unknown) => void | Promise<void>;
}

export interface DurableExecutiveEventAdapterState {
    readonly running: boolean;
    readonly received: number;
    readonly duplicates: number;
    readonly delivered: number;
    readonly failed: number;
}

const toInboxRecord = (event: ExecutiveSystemEvent, now: Date): ExecutiveEventInboxRecord => ({
    id: event.id,
    type: event.type,
    occurredAt: event.occurredAt ?? now,
    metadata: event.metadata,
    status: "PENDING",
    attempts: 0,
    createdAt: now,
    updatedAt: now,
});

const toWakeEvent = (event: ExecutiveEventInboxRecord): ExecutiveWakeEvent => ({
    reason: event.type as ExecutiveWakeEvent["reason"],
    occurredAt: event.occurredAt,
});

/**
 * Durable event boundary for the executive.
 *
 * Events are written to the inbox before they can wake the executive. Delivery
 * is claim-based, so duplicate provider/system events do not cause duplicate
 * wakes, and a process crash during delivery leaves PROCESSING work reclaimable
 * after its lease expires.
 */
export class DurableExecutiveEventAdapter {
    private unsubscribe: (() => void) | undefined;
    private running = false;
    private draining: Promise<void> | undefined;
    private received = 0;
    private duplicates = 0;
    private delivered = 0;
    private failed = 0;

    constructor(private readonly options: DurableExecutiveEventAdapterOptions) {
        if (!Number.isFinite(options.staleAfterMs) || options.staleAfterMs < 1) {
            throw new Error("staleAfterMs must be at least 1 millisecond.");
        }
    }

    getState(): DurableExecutiveEventAdapterState {
        return {
            running: this.running,
            received: this.received,
            duplicates: this.duplicates,
            delivered: this.delivered,
            failed: this.failed,
        };
    }

    start(): void {
        if (this.running) return;
        this.running = true;
        this.unsubscribe = this.options.source.subscribe((event) => {
            void this.accept(event).catch((error) => {
                void this.options.onError?.(error);
            });
        });
        void this.drain().catch((error) => {
            void this.options.onError?.(error);
        });
    }

    stop(): void {
        this.running = false;
        this.unsubscribe?.();
        this.unsubscribe = undefined;
    }

    async accept(event: ExecutiveSystemEvent): Promise<"RECEIVED" | "DUPLICATE"> {
        const now = this.options.now?.() ?? new Date();
        const result = await this.options.inbox.receive(toInboxRecord(event, now));

        if (result === "RECEIVED") this.received += 1;
        else this.duplicates += 1;

        if (this.running) {
            await this.drain();
        }

        return result;
    }

    async drain(): Promise<void> {
        if (this.draining) return this.draining;

        this.draining = this.drainInternal().finally(() => {
            this.draining = undefined;
        });

        return this.draining;
    }

    private async drainInternal(): Promise<void> {
        const now = this.options.now?.() ?? new Date();
        while (true) {
            const event = await this.options.inbox.claimNext(now, this.options.staleAfterMs);
            if (!event) return;

            try {
                await this.options.trigger.wake(toWakeEvent(event));
                await this.options.inbox.markDelivered(event.id, this.options.now?.() ?? new Date());
                this.delivered += 1;
            } catch (error) {
                this.failed += 1;
                await this.options.inbox.markFailed(
                    event.id,
                    error instanceof Error ? error.message : String(error),
                );
                await this.options.onError?.(error);
            }
        }
    }
}
