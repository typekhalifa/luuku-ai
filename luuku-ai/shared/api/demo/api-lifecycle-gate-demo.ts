import { ApiLifecycleGate } from "../api-lifecycle-gate";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
    const normalStartup = new ApiLifecycleGate();
    assert(normalStartup.canStartListener(), "Listener should be allowed before shutdown is requested.");

    let listenerStarts = 0;
    let releaseStartup!: () => void;
    const startupPending = new Promise<void>((resolve) => {
        releaseStartup = resolve;
    });

    const gatedStartup = new ApiLifecycleGate();
    const startAfterInitialization = async (): Promise<void> => {
        await startupPending;
        if (!gatedStartup.canStartListener()) return;
        listenerStarts += 1;
    };

    const startup = startAfterInitialization();
    gatedStartup.requestShutdown();
    assert(gatedStartup.isShutdownRequested(), "Shutdown request must be recorded immediately.");
    assert(!gatedStartup.canStartListener(), "Listener must be blocked once shutdown is requested.");

    releaseStartup();
    await startup;
    assert(listenerStarts === 0, "A pending startup must not open a listener after shutdown begins.");

    gatedStartup.requestShutdown();
    assert(!gatedStartup.canStartListener(), "Repeated shutdown requests must remain fail-closed.");

    console.log("API lifecycle gate: normal startup remains allowed before shutdown: PASS");
    console.log("API lifecycle gate: shutdown during pending initialization blocks listener: PASS");
    console.log("API lifecycle gate: repeated shutdown request remains fail-closed: PASS");
    console.log("API lifecycle gate: PASS");
}

void main().catch((error: unknown) => {
    console.error("API lifecycle gate: FAIL", error);
    process.exitCode = 1;
});
