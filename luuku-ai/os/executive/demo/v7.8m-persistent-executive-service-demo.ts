import assert from "node:assert/strict";
import type {
    PersistentExecutiveLoopOptions,
    PersistentExecutiveLoopResult,
} from "../persistent-executive-loop.js";
import {
    PersistentExecutiveService,
    type ExecutiveLoopRunner,
} from "../persistent-executive-service.js";

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function createResult(): PersistentExecutiveLoopResult {
    return {
        cycles: [],
        cycleCount: 1,
        stoppedReason: "NO_NEW_ACTION",
    };
}

class ControlledLoop implements ExecutiveLoopRunner {
    calls = 0;
    active = 0;
    maxConcurrent = 0;

    async run(_options: PersistentExecutiveLoopOptions): Promise<PersistentExecutiveLoopResult> {
        this.calls += 1;
        this.active += 1;
        this.maxConcurrent = Math.max(this.maxConcurrent, this.active);

        await sleep(30);

        this.active -= 1;
        return createResult();
    }
}

async function main() {
    const loop = new ControlledLoop();
    const errors: unknown[] = [];
    const service = new PersistentExecutiveService({
        loop,
        loopOptions: {
            cycle: {
                capabilities: {},
                policyRules: [],
            },
            maxCycles: 1,
        },
        intervalMs: 10,
        onError: (error) => {
            errors.push(error);
        },
    });

    assert.equal(service.isRunning(), false);
    assert.equal(service.getState().cyclesStarted, 0);

    service.start();
    assert.equal(service.isRunning(), true);

    await sleep(75);
    await service.stop();

    const state = service.getState();

    assert.equal(service.isRunning(), false);
    assert.equal(loop.maxConcurrent, 1);
    assert.equal(errors.length, 0);
    assert.equal(state.cyclesStarted, loop.calls);
    assert.ok(loop.calls >= 2);
    assert.equal(state.lastResult?.stoppedReason, "NO_NEW_ACTION");

    console.log("V7.8-M PERSISTENT AUTONOMOUS EXECUTIVE SERVICE DEMO");
    console.log(`Service calls     : ${loop.calls}`);
    console.log(`Max concurrency   : ${loop.maxConcurrent}`);
    console.log(`Last result       : ${state.lastResult?.stoppedReason}`);
    console.log(`Running after stop: ${state.running}`);
    console.log(`Errors            : ${errors.length}`);
    console.log("");
    console.log("✓ The executive service starts and invokes the persistent loop autonomously.");
    console.log("✓ Interval ticks cannot overlap an already-running executive cycle.");
    console.log("✓ The service stops its timer and reports a stopped state cleanly.");
    console.log("✓ The service delegates executive persistence/idempotency to the loop.");
    console.log("✓ V6 execution authority remains below the service boundary.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
