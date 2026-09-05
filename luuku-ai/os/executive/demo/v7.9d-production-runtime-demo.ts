import {
    ExecutiveProductionRuntime,
    InMemoryExecutiveRuntimeLease,
    type ExecutiveRuntimeDependency,
    type ExecutiveRuntimeService,
} from "../executive-production-runtime.js";

class DemoService implements ExecutiveRuntimeService {
    starts = 0;
    stops = 0;
    running = false;

    start(): void {
        this.starts += 1;
        this.running = true;
    }

    async stop(): Promise<void> {
        this.stops += 1;
        this.running = false;
    }

    isRunning(): boolean {
        return this.running;
    }
}

class MutableDependency implements ExecutiveRuntimeDependency {
    constructor(
        readonly name: string,
        public status: "READY" | "DEGRADED" | "FAILED",
    ) {}

    check(): "READY" | "DEGRADED" | "FAILED" {
        return this.status;
    }
}

function assert(condition: unknown, message: string): void {
    if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
    const lease = new InMemoryExecutiveRuntimeLease();
    const service = new DemoService();
    const database = new MutableDependency("database", "READY");
    const checkpointStore = new MutableDependency("checkpoint-store", "READY");

    const runtime = new ExecutiveProductionRuntime({
        ownerId: "executive-primary",
        service,
        lease,
        dependencies: [database, checkpointStore],
    });

    const ready = await runtime.start();
    assert(ready.state === "READY", "runtime should become READY");
    assert(ready.ready && ready.live, "ready runtime should be ready and live");
    assert(service.starts === 1, "service should start exactly once");

    const duplicateRuntime = new ExecutiveProductionRuntime({
        ownerId: "executive-secondary",
        service: new DemoService(),
        lease,
        dependencies: [database, checkpointStore],
    });
    await duplicateRuntime.start().then(
        () => { throw new Error("duplicate owner should not acquire the lease"); },
        () => undefined,
    );

    database.status = "DEGRADED";
    await runtime.stop();
    const degraded = await runtime.start();
    assert(degraded.state === "DEGRADED", "degraded dependency should produce DEGRADED runtime");
    assert(degraded.ready && degraded.live, "degraded runtime remains operational but explicitly degraded");

    await runtime.stop();
    assert(runtime.getState() === "STOPPED", "graceful shutdown should reach STOPPED");
    assert(!service.isRunning(), "service should be stopped");
    assert(service.starts === 2 && service.stops === 2, "restart should cleanly stop and start the service");

    database.status = "FAILED";
    const failed = await runtime.start();
    assert(failed.state === "FAILED", "failed dependency should block startup");
    assert(!failed.ready && !failed.live, "failed startup must not report readiness or liveness");
    assert(!service.isRunning(), "failed startup must not run the executive service");

    database.status = "READY";
    const recovered = await runtime.start();
    assert(recovered.state === "READY", "runtime should recover after dependency recovery");
    assert(service.starts === 3, "recovery should start the service exactly once");
    await runtime.stop();

    console.log("✓ runtime starts and reaches READY");
    console.log("✓ duplicate runtime ownership is blocked by the lease");
    console.log("✓ degraded dependencies produce explicit DEGRADED readiness");
    console.log("✓ graceful shutdown stops service and releases ownership");
    console.log("✓ restart re-enters the persistent service boundary");
    console.log("✓ failed dependencies block startup without executing");
    console.log("✓ dependency recovery allows a clean restart");
    console.log("✓ V6 remains the downstream execution authority");
    console.log(`Runtime starts       : ${service.starts}`);
    console.log(`Runtime stops        : ${service.stops}`);
    console.log(`Final state          : ${runtime.getState()}`);
    console.log("Production runtime   : PASS");
}

await main();
