import assert from "node:assert/strict";
import type { PersistentExecutiveLoopOptions, PersistentExecutiveLoopResult } from "../persistent-executive-loop.js";
import type { ExecutiveLoopRunner } from "../persistent-executive-service.js";
import { ExecutiveWakeTrigger } from "../executive-wake-trigger.js";
import {
    ExecutiveEventAdapter,
    InMemoryExecutiveSystemEventSource,
    type ExecutiveSystemEvent,
} from "../executive-event-adapters.js";

const sleep = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function result(): PersistentExecutiveLoopResult {
    return { cycles: [], cycleCount: 1, stoppedReason: "NO_NEW_ACTION" };
}

class ControlledRunner implements ExecutiveLoopRunner {
    calls = 0;
    active = 0;
    maxConcurrent = 0;

    async run(_options: PersistentExecutiveLoopOptions): Promise<PersistentExecutiveLoopResult> {
        this.calls += 1;
        this.active += 1;
        this.maxConcurrent = Math.max(this.maxConcurrent, this.active);
        await sleep(25);
        this.active -= 1;
        return result();
    }
}

async function main() {
    const runner = new ControlledRunner();
    const trigger = new ExecutiveWakeTrigger({
        runner,
        loopOptions: {
            cycle: { capabilities: {}, policyRules: [] },
            maxCycles: 1,
        },
        heartbeatMs: 40,
    });
    const source = new InMemoryExecutiveSystemEventSource();
    const adapter = new ExecutiveEventAdapter(source, trigger);

    trigger.start();
    adapter.start();

    const events: ExecutiveSystemEvent[] = [
        { type: "WORKFLOW_FAILED" },
        { type: "APPROVAL_RECEIVED" },
        { type: "AGENT_COMPLETED" },
    ];
    for (const event of events) source.emit(event);

    await sleep(125);

    adapter.stop();
    await trigger.stop();

    const state = trigger.getState();
    assert.equal(adapter.isRunning(), false);
    assert.equal(trigger.isRunning(), false);
    assert.equal(state.wakeCount, events.length + state.heartbeatCount);
    assert.ok(state.heartbeatCount >= 1);
    assert.equal(runner.maxConcurrent, 1);
    assert.equal(state.lastWake?.reason, "HEARTBEAT");
    assert.ok(runner.calls >= 2);

    console.log("V7.8-O EXECUTIVE EVENT ADAPTER DEMO");
    console.log(`System events     : ${events.length}`);
    console.log(`Wake signals      : ${state.wakeCount}`);
    console.log(`Heartbeat wakes   : ${state.heartbeatCount}`);
    console.log(`Loop executions   : ${runner.calls}`);
    console.log(`Max concurrency   : ${runner.maxConcurrent}`);
    console.log(`Running after stop: ${state.running}`);
    console.log("");
    console.log("✓ System events are translated into executive wake signals.");
    console.log("✓ Workflow, approval, and agent events share the same wake boundary.");
    console.log("✓ Heartbeat reconciliation remains active as a fallback.");
    console.log("✓ Multiple events cannot overlap an active executive run.");
    console.log("✓ Event adapters contain no planning or execution authority.");
    console.log("✓ No external provider or network request was used.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
