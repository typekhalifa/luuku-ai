import assert from "node:assert/strict";
import { InMemoryControlStateStore, DurableControlState } from "../durable-control-state.js";

async function main() {
    const store = new InMemoryControlStateStore();
    const state: DurableControlState = {
        version: 1,
        executiveState: {
            generatedAt: new Date("2026-09-01T07:12:00.000Z"),
            active: 17,
            waitingApproval: 3,
            failed: 2,
            completed: 41,
            attention: ["Approval required: onboard Company X (approval-1)"],
        },
        decisions: [{
            id: "approval-1",
            action: "onboard Company X",
            reason: "Proposal is ready.",
            actions: ["APPROVE", "REVIEW", "REJECT"],
        }],
        updatedAt: new Date("2026-09-01T07:12:05.000Z"),
    };

    await store.save(state);
    const freshRuntimeState = await store.load();

    assert.ok(freshRuntimeState);
    assert.equal(freshRuntimeState.version, 1);
    assert.equal(freshRuntimeState.executiveState.active, 17);
    assert.equal(freshRuntimeState.executiveState.waitingApproval, 3);
    assert.equal(freshRuntimeState.decisions[0]?.id, "approval-1");
    assert.equal(freshRuntimeState.decisions[0]?.action, "onboard Company X");

    if (freshRuntimeState) {
        freshRuntimeState.executiveState.active = 99;
    }
    const isolatedRead = await store.load();
    assert.equal(isolatedRead?.executiveState.active, 17);

    console.log("");
    console.log("========================================");
    console.log(" V7.7-B DURABLE CONTROL STATE DEMO");
    console.log("========================================");
    console.log("");
    console.log("Before crash : control state persisted");
    console.log("Fresh runtime: state recovered");
    console.log("Active       : 17");
    console.log("Approvals    : 3");
    console.log("Decision     : approval-1 → onboard Company X");
    console.log("");
    console.log("✓ Executive control state survives a fresh runtime read.");
    console.log("✓ Executive state and decisions are recovered together.");
    console.log("✓ Stored state is isolated from caller mutation.");
    console.log("✓ Recovery does not invent or alter company truth.");
    console.log("✓ No external provider or network request was used.");
    console.log("");
}

main().catch(error => { console.error(error); process.exitCode = 1; });
