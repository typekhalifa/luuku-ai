import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaActuationIdempotencyStore } from "../prisma-actuation-idempotency-store.js";
import type { ProductionActuationResult } from "../production-actuator.js";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

async function main(): Promise<void> {
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
    const concurrentKey = `${prefix}/concurrent`;
    const crashKey = `${prefix}/interrupted`;
    const tenantAKey = `${prefix}/COMPANY:tenant-a/workflow/step`;
    const tenantBKey = `${prefix}/COMPANY:tenant-b/workflow/step`;

    try {
        await db.$connect();

        console.log("PHASE 5.4-G — REAL DATABASE IDEMPOTENCY INTEGRATION");
        console.log("Database connection                 : CONNECTED");
        console.log("External provider calls              : 0 (database-only test)");

        // Separate store instances model independent application processes.
        const processA = new PrismaActuationIdempotencyStore(db);
        const processB = new PrismaActuationIdempotencyStore(db);
        const claims = await Promise.all([
            processA.claim(concurrentKey),
            processB.claim(concurrentKey),
        ]);

        const acquired = claims.filter(claim => claim.status === "ACQUIRED");
        const refused = claims.filter(claim => claim.status === "UNKNOWN");
        assert(acquired.length === 1, `Expected exactly one durable claim owner; got ${acquired.length}.`);
        assert(refused.length === 1, `Expected the competing process to fail closed as UNKNOWN; got ${refused.length}.`);
        console.log("Concurrent independent-process claim : PASS (one owner)");

        const providerResult: ProductionActuationResult = {
            allowed: true,
            boundary: "V6_EXECUTION_AUTHORITY",
            context: { workflowId: "phase5-real-db-test", stepId: "concurrent" },
            result: {
                success: true,
                summary: "Synthetic result; no provider was called.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "database-only-integration-test",
                    externalId: `synthetic-${randomUUID()}`,
                },
            },
        };

        // Persist a synthetic terminal result; never call email, SMS, or another provider.
        await (acquired[0].status === "ACQUIRED" ? processA : processB)
            .complete(concurrentKey, providerResult, "COMPLETED");

        const restartedProcess = new PrismaActuationIdempotencyStore(db);
        const recovered = await restartedProcess.claim(concurrentKey);
        assert(recovered.status === "COMPLETED", `Expected completed result after fresh store; got ${recovered.status}.`);
        assert(
            recovered.result.result?.evidence?.externalId === providerResult.result?.evidence?.externalId,
            "Fresh store did not recover the original synthetic external ID.",
        );
        console.log("Completed result recovered from DB  : PASS");

        // Leave an IN_FLIGHT row as if the prior process died, then use a new store.
        const crashOwner = new PrismaActuationIdempotencyStore(db);
        const beforeCrash = await crashOwner.claim(crashKey);
        assert(beforeCrash.status === "ACQUIRED", `Expected crash-test claim ACQUIRED; got ${beforeCrash.status}.`);
        const afterRestart = new PrismaActuationIdempotencyStore(db);
        const afterCrash = await afterRestart.claim(crashKey);
        assert(afterCrash.status === "UNKNOWN", `Interrupted claim must fail closed as UNKNOWN; got ${afterCrash.status}.`);
        console.log("Interrupted claim after fresh store   : PASS (UNKNOWN / blocked)");

        // Identical workflow/step identity under different tenant scopes must not collide.
        const tenantStoreA = new PrismaActuationIdempotencyStore(db);
        const tenantStoreB = new PrismaActuationIdempotencyStore(db);
        const [tenantA, tenantB] = await Promise.all([
            tenantStoreA.claim(tenantAKey),
            tenantStoreB.claim(tenantBKey),
        ]);
        assert(tenantA.status === "ACQUIRED", `Tenant A claim failed: ${tenantA.status}.`);
        assert(tenantB.status === "ACQUIRED", `Tenant B claim failed: ${tenantB.status}.");
        console.log("Distinct tenant scopes remain isolated : PASS");

        await tenantStoreA.complete(tenantAKey, {
            allowed: false,
            boundary: "V6_EXECUTION_AUTHORITY",
            context: { workflowId: "workflow", stepId: "step" },
            reason: "Integration-test cleanup release.",
        }, "RELEASED");
        await tenantStoreB.complete(tenantBKey, {
            allowed: false,
            boundary: "V6_EXECUTION_AUTHORITY",
            context: { workflowId: "workflow", stepId: "step" },
            reason: "Integration-test cleanup release.",
        }, "RELEASED");

        console.log("PHASE 5.4-G REAL DATABASE INTEGRATION: PASS");
        console.log("Note: tests durable claim semantics only; no external actuator was invoked.");
    } finally {
        // Delete only rows created by this invocation's random, namespaced test prefix.
        await db.productionActuationIdempotency.deleteMany({
            where: { idempotencyKey: { startsWith: prefix } },
        }).catch(() => undefined);
        await db.$disconnect();
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
