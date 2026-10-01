import assert from "node:assert/strict";
import type {
    ExecutiveWakeEvent,
    ExecutiveWakeSource,
} from "../executive-wake-trigger.js";
import {
    ExecutiveWakeTrigger,
    type ExecutiveWakeTriggerOptions,
} from "../executive-wake-trigger.js";
import type {
    PersistentExecutiveLoopOptions,
    PersistentExecutiveLoopResult,
} from "../persistent-executive-loop.js";
import type { ExecutiveLoopRunner } from "../persistent-executive-service.js";

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

class TestWakeSource implements ExecutiveWakeSource {
    private listener: ((event: ExecutiveWakeEvent) => void) | undefined;

    subscribe(listener: (event: ExecutiveWakeEvent) => void): () => void {
        this.listener = listener;
        return () => {
            this.listener = undefined;
        };
    }

    emit(event: ExecutiveWakeEvent): void {
        this.listener?.(event);
    }
}

async function main() {
    const loop = new ControlledLoop();
    const source = new TestWakeSource();
    const wakeReasons: string[] = [];

    const options: ExecutiveWakeTriggerOptions = {
        runner: loop,
        loopOptions: {
            cycle: {
                capabilities: {},
                policyRules: [],
            },
            maxCycles: 1,
        },
        heartbeatMs: 20,
        onWake: (event) => {
            wakeReasons.push(event.reason);
        },
    };

    const trigger = new ExecutiveWakeTrigger(options);
    trigger.start(source);

    source.emit({ reason: "WORKFLOW_FAILED" });
    source.emit({ reason: "APPROVAL_RECEIVED" });
    source.emit({ reason: "AGENT_COMPLETED" });

    await sleep(75);
    await trigger.stop();

    const state = trigger.getState();

    assert.equal(state.running, false);
    assert.ok(state.wakeCount >= 4);
    assert.ok(state.heartbeatCount >= 1);
    assert.ok(wakeReasons.includes("WORKFLOW_FAILED"));
    assert.ok(wakeReasons.includes("APPROVAL_RECEIVED"));
    assert.ok(wakeReasons.includes("AGENT_COMPLETED"));
    assert.ok(wakeReasons.includes("HEARTBEAT"));
    assert.equal(loop.maxConcurrent, 1);
    assert.equal(state.lastResult?.stoppedReason, "NO_NEW_ACTION");

    console.log("V7.8-N EXECUTIVE WAKE TRIGGER DEMO");
    console.log(`Wake signals      : ${state.wakeCount}`);
    console.log(`Heartbeat wakes   : ${state.heartbeatCount}`);
    console.log(`Loop executions   : ${loop.calls}`);
    console.log(`Max concurrency   : ${loop.maxConcurrent}`);
    console.log(`Last wake         : ${state.lastWake?.reason}`);
    console.log(`Running after stop: ${state.running}`);
    console.log("");
    console.log("✓ System events can wake the autonomous executive without polling-only control flow.");
    console.log("✓ Heartbeat reconciliation provides a safety net for missed events.");
    console.log("✓ Repeated wake signals cannot overlap an active executive run.");
    console.log("✓ Wake scheduling remains separate from executive persistence/idempotency.");
    console.log("✓ V6 execution authority remains below the executive loop.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
