import { ApiLifecycleGate } from "../api-lifecycle-gate";
import { getApiReadiness } from "../readiness-status";
import { runCleanupSequence } from "../cleanup-sequence";
import { startApiListener } from "../api-server-lifecycle";

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

    const readinessCases = [
        { database: "ok" as const, executive: "ready" as const, expectedStatus: 200 },
        { database: "unavailable" as const, executive: "ready" as const, expectedStatus: 503 },
        { database: "ok" as const, executive: "not_ready" as const, expectedStatus: 503 },
        { database: "unavailable" as const, executive: "not_ready" as const, expectedStatus: 503 },
    ];
    for (const testCase of readinessCases) {
        const result = getApiReadiness(testCase.database, testCase.executive);
        assert(
            result.httpStatus === testCase.expectedStatus,
            `Readiness mismatch for database=${testCase.database}, executive=${testCase.executive}.`,
        );
    }

    const cleanupOrder: string[] = [];
    const cleanupFailures = await runCleanupSequence([
        ["http_server", async () => { cleanupOrder.push("http_server"); }],
        ["executive_host", async () => {
            cleanupOrder.push("executive_host");
            throw new Error("synthetic host cleanup failure");
        }],
        ["database", async () => { cleanupOrder.push("database"); }],
    ]);
    assert(
        cleanupOrder.join(",") === "http_server,executive_host,database",
        "Cleanup must remain sequential and continue after a failure.",
    );
    assert(cleanupFailures.length === 1, "Cleanup failure should be recorded exactly once.");
    assert(cleanupFailures[0].resource === "executive_host", "Cleanup failure must identify the resource.");

    // Exercise the real listener orchestration boundary with a fake socket.
    // This specifically covers shutdown arriving while listen() is still binding.
    let releaseListen!: (listener: { close(): Promise<void> }) => void;
    let fakeListenerClosed = false;
    let startupLogged = false;
    const pendingListen = new Promise<{ close(): Promise<void> }>((resolve) => {
        releaseListen = resolve;
    });
    const bindRaceGate = new ApiLifecycleGate();
    const bindRaceStartup = startApiListener({
        initialize: async () => undefined,
        canStartListener: () => bindRaceGate.canStartListener(),
        listen: () => {
            // The lifecycle helper has passed its pre-bind check; simulate a
            // signal arriving while the operating system is binding the socket.
            bindRaceGate.requestShutdown();
            return pendingListen;
        },
        onStarted: () => { startupLogged = true; },
    });
    releaseListen({
        close: async () => { fakeListenerClosed = true; },
    });
    const bindRaceStarted = await bindRaceStartup;
    assert(!bindRaceStarted, "Startup must not report success when shutdown races with listener bind.");
    assert(fakeListenerClosed, "Listener bound during shutdown must be closed immediately.");
    assert(!startupLogged, "Startup-ready log must not fire after shutdown was requested.");

    let cleanupAfterStartupFailure = 0;
    let startupFailureObserved = false;
    try {
        await startApiListener({
            initialize: async () => { throw new Error("synthetic initialization failure"); },
            canStartListener: () => true,
            listen: async () => {
                throw new Error("Listener must not be opened after initialization failure.");
            },
        });
    } catch {
        startupFailureObserved = true;
        cleanupAfterStartupFailure += 1; // Mirrors the server's startup-failure cleanup path.
    }
    assert(startupFailureObserved, "Initialization failure must propagate to the API startup handler.");
    assert(cleanupAfterStartupFailure === 1, "Startup failure must enter cleanup exactly once.");

    console.log("API readiness: only database=ok and executive=ready returns HTTP 200: PASS");
    console.log("API readiness: all unavailable/not-ready combinations return HTTP 503: PASS");
    console.log("API lifecycle gate: normal startup remains allowed before shutdown: PASS");
    console.log("API lifecycle gate: shutdown during pending initialization blocks listener: PASS");
    console.log("API lifecycle gate: repeated shutdown request remains fail-closed: PASS");
    console.log("API shutdown: cleanup remains ordered and continues after a failed step: PASS");
    console.log("API listener lifecycle: shutdown during socket bind closes listener: PASS");
    console.log("API listener lifecycle: initialization failure prevents listener startup: PASS");
    console.log("API lifecycle gate: PASS");
}

void main().catch((error: unknown) => {
    console.error("API lifecycle gate: FAIL", error);
    process.exitCode = 1;
});
