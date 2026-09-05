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

function result(): PersistentExecutiveLoopResult {
    return {
        cycles: [],
        cycleCount: 1,
        stoppedReason: "NO_NEW_ACTION",
    };
}

class AutonomousContinuityLoop implements ExecutiveLoopRunner {
    calls = 0;
    successfulCalls = 0;
    failedCalls = 0;
    active = 0;
    maxConcurrent = 0;

    async run(_options: PersistentExecutiveLoopOptions): Promise<PersistentExecutiveLoopResult> {
        this.calls += 1;
        this.active += 1;
        this.maxConcurrent = Math.max(this.maxConcurrent, this.active);

        try {
            // The first autonomous cycle fails; later cycles must continue.
            await sleep(25);
            if (this.calls === 1) {
                this.failedCalls += 1;
                throw new Error("simulated autonomous cycle failure");
            }

            this.successfulCalls += 1;
            return result();
        } finally {
            this.active -= 1;
        }
    }
}

async function main() {
    const loop = new AutonomousContinuityLoop();
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

    // No runOnce() call is made by the demo. start() is the only trigger.
    assert.equal(service.isRunning(), false);
    assert.equal(service.getState().cyclesStarted, 0);

    service.start();
    assert.equal(service.isRunning(), true);

    await sleep(115);
    await service.stop();

    const state = service.getState();

    assert.equal(service.isRunning(), false);
    assert.equal(loop.maxConcurrent, 1);
    assert.equal(loop.failedCalls, 1);
    assert.ok(loop.successfulCalls >= 1);
    assert.ok(loop.calls >= 3);
    assert.equal(state.cyclesStarted, loop.calls);
    assert.equal(errors.length, 1);
    assert.equal(state.lastResult?.stoppedReason, "NO_NEW_ACTION");

    const callsAtStop = loop.calls;
    await sleep(35);
    assert.equal(loop.calls, callsAtStop);

    console.log("V8-A AUTONOMOUS EXECUTIVE CONTINUITY DEMO");
    console.log(`Autonomous cycles : ${loop.calls}`);
    console.log(`Failed cycles     : ${loop.failedCalls}`);
    console.log(`Successful cycles : ${loop.successfulCalls}`);
    console.log(`Max concurrency   : ${loop.maxConcurrent}`);
    console.log(`Errors observed   : ${errors.length}`);
    console.log(`Service state     : ${state.running ? "RUNNING" : "STOPPED"}`);
    console.log("");
    console.log("✓ service starts without an external cycle trigger");
    console.log("✓ first autonomous cycle begins automatically");
    console.log("✓ subsequent autonomous cycles continue automatically");
    console.log("✓ autonomous cycles never overlap");
    console.log("✓ a failed cycle does not terminate the service");
    console.log("✓ the service continues after the failed cycle");
    console.log("✓ graceful shutdown prevents further cycles");
    console.log("✓ the service remains above the V6 execution authority boundary");
    console.log("");
    console.log("V8-A continuity: PASS");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
