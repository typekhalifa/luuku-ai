import type { AutonomousExecutiveCycleOptions, AutonomousExecutiveCycleResult } from "./autonomous-executive-cycle.js";
import { AutonomousExecutiveCycle } from "./autonomous-executive-cycle.js";
import {
    ExecutiveLoopCheckpointStore,
    InMemoryExecutiveLoopCheckpointStore,
    intentCheckpointKey,
} from "./executive-loop-checkpoint.js";

export interface PersistentExecutiveLoopOptions {
    readonly cycle: AutonomousExecutiveCycleOptions;
    readonly checkpointStore?: ExecutiveLoopCheckpointStore;
    readonly maxCycles?: number;
}

export interface PersistentExecutiveLoopResult {
    readonly cycles: readonly AutonomousExecutiveCycleResult[];
    readonly cycleCount: number;
    readonly stoppedReason: "MAX_CYCLES" | "NO_NEW_ACTION";
}

/**
 * Runs the executive cycle repeatedly while preserving an intent checkpoint.
 * V6 remains the execution authority; this loop only decides when to cycle again.
 */
export class PersistentExecutiveLoop {
    private readonly checkpointStore: ExecutiveLoopCheckpointStore;

    constructor(
        private readonly cycle: AutonomousExecutiveCycle,
        checkpointStore: ExecutiveLoopCheckpointStore = new InMemoryExecutiveLoopCheckpointStore(),
    ) {
        this.checkpointStore = checkpointStore;
    }

    async run(
        options: PersistentExecutiveLoopOptions,
        now = new Date(),
    ): Promise<PersistentExecutiveLoopResult> {
        const maxCycles = options.maxCycles ?? 10;
        if (maxCycles < 1) throw new Error("maxCycles must be at least 1.");

        const results: AutonomousExecutiveCycleResult[] = [];
        let checkpoint = await this.checkpointStore.load();

        for (let cycleIndex = 0; cycleIndex < maxCycles; cycleIndex += 1) {
            const result = await this.cycle.run({
                ...options.cycle,
                shouldProcessIntent: async (intent) => {
                    return !checkpoint.handledIntentKeys.includes(intentCheckpointKey(intent));
                },
            }, new Date(now.getTime() + cycleIndex));

            results.push(result);

            const completedRecoveryKeys = result.intentResults
                .filter((item) =>
                    item.intent.type === "RECOVER_FAILED_WORK" &&
                    item.decision?.status === "ELIGIBLE" &&
                    (item.submission?.status === "SUBMITTED" || item.submission?.status === "ALREADY_SUBMITTED") &&
                    result.runtime?.completed.length === 1,
                )
                .map((item) => intentCheckpointKey(item.intent));

            const handledIntentKeys = [...new Set([
                ...checkpoint.handledIntentKeys,
                ...completedRecoveryKeys,
            ])];

            checkpoint = {
                version: checkpoint.version,
                handledIntentKeys,
                cycleCount: checkpoint.cycleCount + 1,
                updatedAt: new Date(),
            };
            await this.checkpointStore.save(checkpoint);

            const createdNewAction = result.intentResults.some((item) =>
                item.decision?.status === "ELIGIBLE" &&
                (item.submission?.status === "SUBMITTED" || item.submission?.status === "ALREADY_SUBMITTED"),
            );

            if (!createdNewAction || completedRecoveryKeys.length > 0) {
                return {
                    cycles: results,
                    cycleCount: results.length,
                    stoppedReason: "NO_NEW_ACTION",
                };
            }
        }

        return {
            cycles: results,
            cycleCount: results.length,
            stoppedReason: "MAX_CYCLES",
        };
    }
}
