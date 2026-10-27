import { createServer, type Server } from "node:http";
import { once } from "node:events";
import { ApiLifecycleGate } from "../api-lifecycle-gate";
import { startApiListener } from "../api-server-lifecycle";
import { getApiReadiness } from "../readiness-status";
import { runCleanupSequence } from "../cleanup-sequence";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function closeServer(server: Server): Promise<void> {
    if (!server.listening) return;
    await new Promise<void>((resolve, reject) => {
        server.close((error) => error ? reject(error) : resolve());
    });
}

async function main(): Promise<void> {
    // Real loopback HTTP server; all service dependencies are deterministic fakes.
    const gate = new ApiLifecycleGate();
    let initialized = false;
    let server: Server | undefined;
    let listenCount = 0;

    const started = await startApiListener({
        initialize: async () => { initialized = true; },
        canStartListener: () => gate.canStartListener(),
        listen: async () => {
            listenCount += 1;
            server = createServer((request, response) => {
                if (request.url !== "/readyz") {
                    response.writeHead(404).end();
                    return;
                }
                const ready = process.env.API_LIFECYCLE_TEST_READY === "true";
                const result = getApiReadiness(ready ? "ok" : "unavailable", ready ? "ready" : "not_ready");
                response.writeHead(result.httpStatus, { "content-type": "application/json" });
                response.end(JSON.stringify({ status: result.httpStatus === 200 ? "ready" : "not_ready" }));
            });
            server.listen(0, "127.0.0.1");
            await once(server, "listening");
            return { close: () => closeServer(server!) };
        },
    });

    assert(initialized, "Initialization must finish before listener startup.");
    assert(started && server?.listening, "Listener must be listening after successful startup.");
    assert(listenCount === 1, "Listener should be opened exactly once.");

    const address = server.address();
    assert(address && typeof address === "object", "Ephemeral listener address should exist.");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    // Probe both readiness outcomes over a real HTTP request.
    process.env.API_LIFECYCLE_TEST_READY = "false";
    const notReadyResponse = await fetch(`${baseUrl}/readyz`);
    assert(notReadyResponse.status === 503, "Readiness endpoint must return HTTP 503 when dependencies are not ready.");

    process.env.API_LIFECYCLE_TEST_READY = "true";
    const readyResponse = await fetch(`${baseUrl}/readyz`);
    assert(readyResponse.status === 200, "Readiness endpoint must return HTTP 200 when dependencies are ready.");
    delete process.env.API_LIFECYCLE_TEST_READY;

    // Simulate signal handler idempotency around the cleanup boundary.
    const cleanupOrder: string[] = [];
    let shutdownPromise: Promise<void> | undefined;
    const shutdown = (): Promise<void> => {
        gate.requestShutdown();
        if (shutdownPromise) return shutdownPromise;
        shutdownPromise = (async () => {
            const failures = await runCleanupSequence([
                ["http_server", async () => { cleanupOrder.push("http_server"); await closeServer(server!); }],
                ["executive_host", async () => { cleanupOrder.push("executive_host"); }],
                ["database", async () => { cleanupOrder.push("database"); }],
            ]);
            assert(failures.length === 0, "Successful fake cleanup should not report failures.");
        })();
        return shutdownPromise;
    };

    await Promise.all([shutdown(), shutdown()]);
    assert(!server.listening, "Shutdown must close the local listener.");
    assert(cleanupOrder.join(",") === "http_server,executive_host,database", "Repeated shutdown must execute cleanup once and in order.");

    // Startup failure must never call listen().
    let failedStartupListenCalls = 0;
    let startupFailureCaught = false;
    try {
        await startApiListener({
            initialize: async () => { throw new Error("synthetic executive initialization failure"); },
            canStartListener: () => true,
            listen: async () => {
                failedStartupListenCalls += 1;
                throw new Error("listen must not be called");
            },
        });
    } catch {
        startupFailureCaught = true;
    }
    assert(startupFailureCaught, "Initialization failure must propagate to startup handler.");
    assert(failedStartupListenCalls === 0, "Initialization failure must prevent listener creation.");

    // A failed cleanup step must not prevent later resources from being released.
    const failureOrder: string[] = [];
    const failures = await runCleanupSequence([
        ["http_server", async () => { failureOrder.push("http_server"); }],
        ["executive_host", async () => { failureOrder.push("executive_host"); throw new Error("synthetic cleanup failure"); }],
        ["database", async () => { failureOrder.push("database"); }],
    ]);
    assert(failureOrder.join(",") === "http_server,executive_host,database", "Cleanup must continue after a failed step.");
    assert(failures.length === 1 && failures[0].resource === "executive_host", "Cleanup failure must be reported against the failed resource.");

    console.log("API integration: executive initialization precedes local HTTP listener: PASS");
    console.log("API integration: real HTTP /readyz returns 503 when not ready: PASS");
    console.log("API integration: real HTTP /readyz returns 200 when ready: PASS");
    console.log("API integration: repeated shutdown closes listener and runs cleanup once: PASS");
    console.log("API integration: startup failure prevents listener creation: PASS");
    console.log("API integration: cleanup continues after synthetic failure: PASS");
    console.log("API process lifecycle integration: PASS");
}

void main().catch((error: unknown) => {
    console.error("API process lifecycle integration: FAIL", error);
    process.exitCode = 1;
});
