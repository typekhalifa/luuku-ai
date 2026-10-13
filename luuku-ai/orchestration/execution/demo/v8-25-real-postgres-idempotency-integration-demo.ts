import "dotenv/config";
import { randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { resolve } from "node:path";
import { PrismaClient } from "@prisma/client";
import {
    PrismaActuationIdempotencyStore,
} from "../prisma-actuation-idempotency-store.js";
import {
    buildActuationIdempotencyKey,
} from "../production-actuation-governance.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import { Priority } from "../../task/priority.js";
import type { ProductionActuationResult } from "../production-actuator.js";

const WORKER_RESULT_PREFIX = "PHASE5_WORKER_RESULT=";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function testStep(
    workflowId: string,
    id: string,
    companyId = "company-a",
): WorkflowStep {
    return {
        id,
        workflowId,
        ownership: { scope: "COMPANY", companyId },
        title: "Database-only idempotency integration step",
        description: "Synthetic Phase 5 integration test; no provider is called.",
        agentId: "phase5-test",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };
}

interface WorkerResult {
    mode: string;
    status: string;
    externalId?: string;
    companyId?: string;
    error?: string;
}

interface WorkerHandle {
    ready: Promise<void>;
    result: Promise<WorkerResult>;
    start(): void;
}

function spawnWorker(
    mode: "--claim-worker" | "--recover-worker",
    key: string,
    step: WorkflowStep,
): WorkerHandle {
    const scriptPath = resolve(process.argv[1] ?? "");
    assert(scriptPath.length > 1, "Could not resolve integration demo script path.");

    const child: ChildProcess = spawn(
        process.execPath,
        ["--import", "tsx", scriptPath, mode, key, JSON.stringify(step)],
        { cwd: process.cwd(), env: process.env, stdio: ["ignore", "pipe", "pipe", "ipc"] },
    );

    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", chunk => { stdout += chunk; });
    child.stderr?.on("data", chunk => { stderr += chunk; });

    const ready = new Promise<void>((resolvePromise, rejectPromise) => {
        child.on("message", message => {
            if (message === "READY") resolvePromise();
        });
        child.on("error", rejectPromise);
        child.on("close", code => {
            if (code !== 0) rejectPromise(new Error(
                `Worker ${mode} exited before/while becoming ready (exit ${code}).\\nstdout:\\n${stdout}\\nstderr:\\n${stderr}`,
            ));
        });
    });

    const result = new Promise<WorkerResult>((resolvePromise, rejectPromise) => {
        child.on("error", rejectPromise);
        child.on("close", code => {
            const marker = stdout
                .split(/\\r?\\n/)
                .find(line => line.startsWith(WORKER_RESULT_PREFIX));

            if (code !== 0 || !marker) {
                rejectPromise(new Error(
                    `Worker ${mode} failed (exit ${code}).\\nstdout:\\n${stdout}\\nstderr:\\n${stderr}`,
                ));
                return;
            }

            try {
                resolvePromise(JSON.parse(marker.slice(WORKER_RESULT_PREFIX.length)) as WorkerResult);
            } catch (error) {
                rejectPromise(new Error(`Could not parse worker output: ${String(error)}\\n${stdout}`));
            }
        });
    });

    return {
        ready,
        result,
        start() {
            if (!child.connected) throw new Error(`Worker ${mode} has no IPC channel.`);
            child.send("START");
        },
    };
}

async function runWorker(
    mode: "--claim-worker" | "--recover-worker",
    key: string,
    step: WorkflowStep,
): Promise<WorkerResult> {
    const worker = spawnWorker(mode, key, step);
    await worker.ready;
    worker.start();
    return worker.result;
}

async function runWorkerMode(args: string[]): Promise<boolean> {
    const mode = args[0];
    if (mode !== "--claim-worker" && mode !== "--recover-worker") return false;

    const key = args[1];
    const serializedStep = args[2];
    if (!key || !serializedStep) {
        throw new Error(`Worker mode ${mode} requires an idempotency key and serialized WorkflowStep.`);
    }

    const step = JSON.parse(serializedStep) as WorkflowStep;
    const db = new PrismaClient();

    try {
        await db.$connect();
        const store = new PrismaActuationIdempotencyStore(db);
        if (typeof process.send !== "function") {
            throw new Error("Worker process requires an IPC channel for synchronized start.");
        }
        process.send("READY");
        await new Promise<void>((resolvePromise, rejectPromise) => {
            process.once("message", message => {
                if (message === "START") resolvePromise();
                else rejectPromise(new Error("Worker received an unexpected start signal."));
            });
        });
        const claim = await store.claim(key, step);
        const result: WorkerResult = {
            mode,
            status: claim.status,
            companyId: step.ownership?.scope === "COMPANY"
                ? step.ownership.companyId
                : undefined,
            externalId: claim.status === "COMPLETED"
                ? claim.result.result?.evidence?.externalId
                : undefined,
        };
        console.log(`${WORKER_RESULT_PREFIX}${JSON.stringify(result)}`);
    } catch (error) {
        console.error(error);
        process.exitCode = 1;
        throw error;
    } finally {
        await db.$disconnect();
    }

    return true;
}

async function main(): Promise<void> {
    if (await runWorkerMode(process.argv.slice(2))) return;

    if (process.env.LUUKU_RUN_REAL_DB_IDEMPOTENCY_TEST !== "YES") {
        throw new Error(
            "Refusing database integration test. Set LUUKU_RUN_REAL_DB_IDEMPOTENCY_TEST=YES only after verifying DATABASE_URL points to a disposable development/test database.",
        );
    }
    if (!process.env.DATABASE_URL?.trim()) {
        throw new Error("DATABASE_URL is required for the real PostgreSQL idempotency test.");
    }

    const db = new PrismaClient();
    const prefix = `phase5-real-db-test/${randomUUID()}`;
    const concurrentStep = testStep(prefix, "concurrent-step");
    const concurrentKey = buildActuationIdempotencyKey(concurrentStep);
    const interruptedStep = testStep(prefix, "interrupted-step");
    const interruptedKey = buildActuationIdempotencyKey(interruptedStep);
    const tenantAStep = testStep(prefix, "shared-step", "tenant-a");
    const tenantBStep = testStep(prefix, "shared-step", "tenant-b");
    const tenantAKey = buildActuationIdempotencyKey(tenantAStep);
    const tenantBKey = buildActuationIdempotencyKey(tenantBStep);

    try {
        await db.$connect();
        console.log("PHASE 5.4-H — CROSS-PROCESS & TENANT OWNERSHIP");
        console.log("Database connection                    : CONNECTED");
        console.log("External provider calls                 : 0 (database-only test)");

        // These are separate Node.js OS processes, each with its own Prisma client and store.
        const competingWorkers = [
            spawnWorker("--claim-worker", concurrentKey, concurrentStep),
            spawnWorker("--claim-worker", concurrentKey, concurrentStep),
        ];
        await Promise.all(competingWorkers.map(worker => worker.ready));
        // Release both processes only after both have connected and are waiting at the barrier.
        competingWorkers.forEach(worker => worker.start());
        const crossProcessClaims = await Promise.all(competingWorkers.map(worker => worker.result));
        const acquired = crossProcessClaims.filter(result => result.status === "ACQUIRED");
        const refused = crossProcessClaims.filter(result => result.status === "UNKNOWN");
        assert(acquired.length === 1,
            `Cross-process race must produce exactly one owner; got ${acquired.length}.`);
        assert(refused.length === 1,
            `Cross-process race must fail closed for the other process; got ${refused.length} UNKNOWN claims.`);

        const concurrentRow = await db.productionActuationIdempotency.findUnique({
            where: { idempotencyKey: concurrentKey },
        });
        assert(concurrentRow?.ownershipScope === "COMPANY",
            "Cross-process claim did not persist COMPANY ownership scope.");
        assert(concurrentRow.companyId === "company-a",
            `Cross-process claim persisted wrong companyId: ${concurrentRow.companyId}.`);
        console.log("Separate OS processes; one durable owner : PASS");
        console.log("Persisted owner metadata               : PASS");

        const syntheticExternalId = `synthetic-${randomUUID()}`;
        const providerResult: ProductionActuationResult = {
            allowed: true,
            boundary: "V6_EXECUTION_AUTHORITY",
            context: { workflowId: prefix, stepId: concurrentStep.id },
            result: {
                success: true,
                summary: "Synthetic result; no provider was called.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "database-only-integration-test",
                    externalId: syntheticExternalId,
                },
            },
        };

        // Complete only the synthetic database record; no external actuator is invoked.
        await new PrismaActuationIdempotencyStore(db).complete(
            concurrentKey, providerResult, "COMPLETED",
        );
        const recovery = await runWorker("--recover-worker", concurrentKey, concurrentStep);
        assert(recovery.status === "COMPLETED",
            `Separate recovery process expected COMPLETED; got ${recovery.status}.`);
        assert(recovery.externalId === syntheticExternalId,
            "Separate recovery process did not recover the exact persisted synthetic result.");
        console.log("Completed result recovered in new OS process : PASS");

        // A child claims this key and exits. A second, newly launched process must fail closed.
        const interruptedOwner = await runWorker("--claim-worker", interruptedKey, interruptedStep);
        assert(interruptedOwner.status === "ACQUIRED",
            `Interrupted-claim setup expected ACQUIRED; got ${interruptedOwner.status}.`);
        const interruptedRecovery = await runWorker(
            "--recover-worker", interruptedKey, interruptedStep,
        );
        assert(interruptedRecovery.status === "UNKNOWN",
            `Fresh process must block interrupted IN_FLIGHT claim; got ${interruptedRecovery.status}.`);
        console.log("Interrupted claim after process exit       : PASS (UNKNOWN / blocked)");

        // Same workflow and step IDs, but different ownership: keys and persisted metadata must differ.
        assert(tenantAKey !== tenantBKey,
            "Tenant ownership did not affect the generated idempotency key.");
        const tenantStoreA = new PrismaActuationIdempotencyStore(db);
        const tenantStoreB = new PrismaActuationIdempotencyStore(db);
        const [tenantAClaim, tenantBClaim] = await Promise.all([
            tenantStoreA.claim(tenantAKey, tenantAStep),
            tenantStoreB.claim(tenantBKey, tenantBStep),
        ]);
        assert(tenantAClaim.status === "ACQUIRED",
            `Tenant A claim failed: ${tenantAClaim.status}.`);
        assert(tenantBClaim.status === "ACQUIRED",
            `Tenant B claim failed: ${tenantBClaim.status}.`);

        const [tenantARow, tenantBRow] = await Promise.all([
            db.productionActuationIdempotency.findUnique({ where: { idempotencyKey: tenantAKey } }),
            db.productionActuationIdempotency.findUnique({ where: { idempotencyKey: tenantBKey } }),
        ]);
        assert(tenantARow?.ownershipScope === "COMPANY" && tenantARow.companyId === "tenant-a",
            "Tenant A ownership metadata was not persisted correctly.");
        assert(tenantBRow?.ownershipScope === "COMPANY" && tenantBRow.companyId === "tenant-b",
            "Tenant B ownership metadata was not persisted correctly.");
        assert(tenantARow.workflowId === tenantBRow.workflowId && tenantARow.stepId === tenantBRow.stepId,
            "Tenant isolation test did not use identical workflow/step identities.");

        const tenantAResult: ProductionActuationResult = {
            allowed: true,
            boundary: "V6_EXECUTION_AUTHORITY",
            context: { workflowId: prefix, stepId: tenantAStep.id },
            result: { success: true, summary: "Tenant A synthetic result.", completedAt: new Date().toISOString(),
                executionStatus: "verified", executed: true, verified: true,
                evidence: { provider: "database-only-integration-test", externalId: "tenant-a-result" } },
        };
        const tenantBResult: ProductionActuationResult = {
            allowed: true,
            boundary: "V6_EXECUTION_AUTHORITY",
            context: { workflowId: prefix, stepId: tenantBStep.id },
            result: { success: true, summary: "Tenant B synthetic result.", completedAt: new Date().toISOString(),
                executionStatus: "verified", executed: true, verified: true,
                evidence: { provider: "database-only-integration-test", externalId: "tenant-b-result" } },
        };
        await Promise.all([
            tenantStoreA.complete(tenantAKey, tenantAResult, "COMPLETED"),
            tenantStoreB.complete(tenantBKey, tenantBResult, "COMPLETED"),
        ]);
        const [tenantAReplay, tenantBReplay] = await Promise.all([
            runWorker("--recover-worker", tenantAKey, tenantAStep),
            runWorker("--recover-worker", tenantBKey, tenantBStep),
        ]);
        assert(tenantAReplay.status === "COMPLETED" && tenantAReplay.externalId === "tenant-a-result",
            "Tenant A recovery did not return only Tenant A's stored result.");
        assert(tenantBReplay.status === "COMPLETED" && tenantBReplay.externalId === "tenant-b-result",
            "Tenant B recovery did not return only Tenant B's stored result.");
        console.log("Tenant ownership metadata persisted correctly : PASS");
        console.log("Tenant-local results recovered independently  : PASS");

        console.log("PHASE 5.4-H CROSS-PROCESS & OWNERSHIP: PASS");
        console.log("Note: real PostgreSQL persistence was exercised; all action results were synthetic and no provider was called.");
    } finally {
        // Every test row records this unique workflow prefix; cleanup is scoped to this invocation.
        await db.productionActuationIdempotency.deleteMany({
            where: { workflowId: { startsWith: prefix } },
        }).catch(() => undefined);
        await db.$disconnect();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
