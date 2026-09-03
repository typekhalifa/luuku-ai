import type {
    PersistentExecutiveLoopOptions,
    PersistentExecutiveLoopResult,
} from "./persistent-executive-loop.js";
import { PersistentExecutiveLoop } from "./persistent-executive-loop.js";

export interface PersistentExecutiveServiceOptions {
    readonly loop: PersistentExecutiveLoop;
    readonly loopOptions: PersistentExecutiveLoopOptions;
    /** Interval between autonomous executive cycles in milliseconds. */
    readonly intervalMs: number;
    /** Run one executive cycle immediately when the service starts. */
    readonly runImmediately?: boolean;
    /** Called when an autonomous cycle fails. The service remains running. */
    readonly onError?: (error: unknown) => void | Promise<void>;
}

export interface PersistentExecutiveServiceState {
    readonly running: boolean;
    readonly cyclesStarted: number;
    readonly lastResult?: PersistentExecutiveLoopResult;
    readonly lastError?: unknown;
}

/**
 * Long-running process boundary for the autonomous executive.
 *
 * The service owns scheduling and lifecycle only. The PersistentExecutiveLoop
 * owns executive persistence/idempotency, while V6 remains the execution
 * authority underneath the loop.
 */
export class PersistentExecutiveService {
    private timer: ReturnType<typeof setInterval> | undefined;
    private activeRun: Promise<PersistentExecutiveLoopResult> | undefined;
    private running = false;
    private cyclesStarted = 0;
    private lastResult: PersistentExecutiveLoopResult | undefined;
    private lastError: unknown;

    constructor(private readonly options: PersistentExecutiveServiceOptions) {
        if (!Number.isFinite(options.intervalMs) || options.intervalMs < 1) {
            throw new Error("intervalMs must be at least 1 millisecond.");
        }
    }

    getState(): PersistentExecutiveServiceState {
        return {
            running: this.running,
            cyclesStarted: this.cyclesStarted,
            lastResult: this.lastResult,
            lastError: this.lastError,
        };
    }

    isRunning(): boolean {
        return this.running;
    }

    async runOnce(): Promise<PersistentExecutiveLoopResult> {
        if (this.activeRun) return this.activeRun;

        this.cyclesStarted += 1;
        this.activeRun = this.options.loop.run(this.options.loopOptions)
            .then((result) => {
                this.lastResult = result;
                this.lastError = undefined;
                return result;
            })
            .catch(async (error) => {
                this.lastError = error;
                await this.options.onError?.(error);
                throw error;
            })
            .finally(() => {
                this.activeRun = undefined;
            });

        return this.activeRun;
    }

    start(): void {
        if (this.running) return;

        this.running = true;
        this.timer = setInterval(() => {
            void this.runOnce().catch(() => undefined);
        }, this.options.intervalMs);

        if (this.options.runImmediately !== false) {
            void this.runOnce().catch(() => undefined);
        }
    }

    async stop(): Promise<void> {
        if (!this.running && !this.timer) return;

        this.running = false;
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = undefined;
        }

        if (this.activeRun) {
            await this.activeRun.catch(() => undefined);
        }
    }
}
