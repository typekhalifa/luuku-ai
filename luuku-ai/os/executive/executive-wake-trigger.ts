import type { PersistentExecutiveLoopOptions, PersistentExecutiveLoopResult } from "./persistent-executive-loop.js";
import type { ExecutiveLoopRunner } from "./persistent-executive-service.js";

export type ExecutiveWakeReason =
    | "WORKFLOW_FAILED"
    | "APPROVAL_RECEIVED"
    | "QUEUE_RUNNABLE"
    | "AGENT_COMPLETED"
    | "COMMUNICATION_RECEIVED"
    | "OBJECTIVE_DUE"
    | "STATE_CHANGED"
    | "HEARTBEAT";

export interface ExecutiveWakeEvent {
    readonly reason: ExecutiveWakeReason;
    readonly occurredAt?: Date;
}

export interface ExecutiveWakeSource {
    subscribe(listener: (event: ExecutiveWakeEvent) => void): () => void;
}

export interface ExecutiveWakeTriggerOptions {
    readonly runner: ExecutiveLoopRunner;
    readonly loopOptions: PersistentExecutiveLoopOptions;
    /** Reconciliation interval used as the safety-net heartbeat. */
    readonly heartbeatMs: number;
    readonly onWake?: (event: ExecutiveWakeEvent) => void | Promise<void>;
}

export interface ExecutiveWakeTriggerState {
    readonly running: boolean;
    readonly wakeCount: number;
    readonly heartbeatCount: number;
    readonly lastWake?: ExecutiveWakeEvent;
    readonly lastResult?: PersistentExecutiveLoopResult;
    readonly lastError?: unknown;
}

/**
 * Event-driven wake boundary for the persistent executive.
 *
 * External systems emit lightweight wake events; the persistent executive loop
 * remains responsible for durable intent/idempotency, and V6 remains the
 * execution authority. A heartbeat periodically reconciles missed events.
 */
export class ExecutiveWakeTrigger {
    private heartbeatTimer: ReturnType<typeof setInterval> | undefined;
    private unsubscribe: (() => void) | undefined;
    private running = false;
    private wakeCount = 0;
    private heartbeatCount = 0;
    private lastWake: ExecutiveWakeEvent | undefined;
    private lastResult: PersistentExecutiveLoopResult | undefined;
    private lastError: unknown;
    private activeWake: Promise<PersistentExecutiveLoopResult> | undefined;

    constructor(private readonly options: ExecutiveWakeTriggerOptions) {
        if (!Number.isFinite(options.heartbeatMs) || options.heartbeatMs < 1) {
            throw new Error("heartbeatMs must be at least 1 millisecond.");
        }
    }

    getState(): ExecutiveWakeTriggerState {
        return {
            running: this.running,
            wakeCount: this.wakeCount,
            heartbeatCount: this.heartbeatCount,
            lastWake: this.lastWake,
            lastResult: this.lastResult,
            lastError: this.lastError,
        };
    }

    isRunning(): boolean {
        return this.running;
    }

    async wake(event: ExecutiveWakeEvent): Promise<PersistentExecutiveLoopResult> {
        if (!this.running) {
            throw new Error("Executive wake trigger is not running.");
        }

        this.wakeCount += 1;
        this.lastWake = event;
        await this.options.onWake?.(event);

        if (this.activeWake) return this.activeWake;

        this.activeWake = this.options.runner.run(this.options.loopOptions)
            .then((result) => {
                this.lastResult = result;
                this.lastError = undefined;
                return result;
            })
            .catch((error) => {
                this.lastError = error;
                throw error;
            })
            .finally(() => {
                this.activeWake = undefined;
            });

        return this.activeWake;
    }

    start(source?: ExecutiveWakeSource): void {
        if (this.running) return;

        this.running = true;
        this.heartbeatTimer = setInterval(() => {
            this.heartbeatCount += 1;
            void this.wake({ reason: "HEARTBEAT" }).catch(() => undefined);
        }, this.options.heartbeatMs);

        if (source) {
            this.unsubscribe = source.subscribe((event) => {
                void this.wake(event).catch(() => undefined);
            });
        }
    }

    async stop(): Promise<void> {
        this.running = false;

        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
            this.heartbeatTimer = undefined;
        }

        this.unsubscribe?.();
        this.unsubscribe = undefined;

        if (this.activeWake) {
            await this.activeWake.catch(() => undefined);
        }
    }
}
