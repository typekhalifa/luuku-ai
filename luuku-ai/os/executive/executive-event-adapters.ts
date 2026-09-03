import type { ExecutiveWakeEvent, ExecutiveWakeTrigger } from "./executive-wake-trigger.js";

export type ExecutiveEventName =
    | "WORKFLOW_FAILED"
    | "APPROVAL_RECEIVED"
    | "QUEUE_RUNNABLE"
    | "AGENT_COMPLETED"
    | "COMMUNICATION_RECEIVED"
    | "OBJECTIVE_DUE"
    | "STATE_CHANGED";

export interface ExecutiveSystemEvent {
    readonly id: string;
    readonly type: ExecutiveEventName;
    readonly occurredAt?: Date;
    readonly metadata?: Readonly<Record<string, unknown>>;
}

export interface ExecutiveSystemEventSource {
    subscribe(listener: (event: ExecutiveSystemEvent) => void): () => void;
}

const wakeReasonFor = (event: ExecutiveSystemEvent): ExecutiveWakeEvent => ({
    reason: event.type,
    occurredAt: event.occurredAt,
});

/**
 * Bridges system event streams into the executive wake boundary.
 *
 * The adapter deliberately contains no planning, persistence, or execution
 * logic. It translates system events into wake signals and lets the existing
 * executive loop decide what, if anything, should happen next.
 */
export class ExecutiveEventAdapter {
    private unsubscribe: (() => void) | undefined;
    private running = false;

    constructor(
        private readonly source: ExecutiveSystemEventSource,
        private readonly trigger: Pick<ExecutiveWakeTrigger, "wake">,
    ) {}

    start(): void {
        if (this.running) return;
        this.running = true;
        this.unsubscribe = this.source.subscribe((event) => {
            void this.trigger.wake(wakeReasonFor(event)).catch(() => undefined);
        });
    }

    stop(): void {
        this.running = false;
        this.unsubscribe?.();
        this.unsubscribe = undefined;
    }

    isRunning(): boolean {
        return this.running;
    }
}

/**
 * Small in-process event source used by tests and demos. Production adapters
 * can implement the same subscription contract around durable event streams.
 */
export class InMemoryExecutiveSystemEventSource implements ExecutiveSystemEventSource {
    private listeners = new Set<(event: ExecutiveSystemEvent) => void>();

    subscribe(listener: (event: ExecutiveSystemEvent) => void): () => void {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    emit(event: ExecutiveSystemEvent): void {
        for (const listener of this.listeners) listener(event);
    }
}
