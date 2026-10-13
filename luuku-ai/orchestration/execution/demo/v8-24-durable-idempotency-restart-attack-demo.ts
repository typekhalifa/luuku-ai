import type { PrismaClient } from "@prisma/client";
import { PrismaActuationIdempotencyStore } from "../prisma-actuation-idempotency-store.js";
import {
    CapabilityAgentAuthorizationPolicy,
    GuardedProductionActuation,
    StaticActuationControl,
    type ActuationIdempotencyStore,
} from "../production-actuation-governance.js";
import {
    InMemoryProductionActuatorRegistry,
    ProductionActuatorComposition,
} from "../production-actuator.js";
import type { WorkflowStep } from "../../workflow/workflow-step.js";
import { Priority } from "../../task/priority.js";
import type { ProductionActuationResult } from "../production-actuator.js";

type StoredRow = {
    id: string;
    idempotencyKey: string;
    ownershipScope: string;
    companyId: string | null;
    workflowId: string;
    stepId: string;
    status: string;
    result: unknown;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
};

function makeStep(): WorkflowStep {
    return {
        id: "durable-restart-step",
        workflowId: "phase5-durable-restart",
        ownership: { scope: "COMPANY", companyId: "company-a" },
        title: "Durable idempotency restart attack",
        description: "Verify durable claims survive a fresh store instance.",
        agentId: "sales",
        capability: "email.send",
        dependsOn: [],
        priority: Priority.MEDIUM,
        requiresApproval: false,
        status: "READY",
    };
}

function fakeDatabase(updateFailure: "none" | "before-commit" | "after-commit" = "none") {
    const rows = new Map<string, StoredRow>();
    let nextId = 0;

    const model = {
        async create(args: { data: Omit<StoredRow, "id" | "createdAt" | "updatedAt" | "result" | "lastError"> & Partial<Pick<StoredRow, "result" | "lastError">> }) {
            const key = args.data.idempotencyKey;
            if (rows.has(key)) {
                const error = new Error("Unique constraint violation") as Error & { code: string };
                error.code = "P2002";
                throw error;
            }
            const now = new Date();
            const row: StoredRow = {
                id: `row-${++nextId}`,
                ...args.data,
                result: args.data.result ?? null,
                lastError: args.data.lastError ?? null,
                createdAt: now,
                updatedAt: now,
            };
            rows.set(key, row);
            return row;
        },
        async findUnique(args: { where: { idempotencyKey: string } }) {
            return rows.get(args.where.idempotencyKey) ?? null;
        },
        async update(args: { where: { idempotencyKey: string }; data: Partial<StoredRow> }) {
            const row = rows.get(args.where.idempotencyKey);
            if (!row) throw new Error("Durable claim not found.");
            if (updateFailure === "before-commit") {
                throw new Error("Injected database failure before commit.");
            }
            const updated = { ...row, ...args.data, updatedAt: new Date() };
            rows.set(args.where.idempotencyKey, updated);
            if (updateFailure === "after-commit") {
                throw new Error("Injected lost response after database commit.");
            }
            return updated;
        },
        async deleteMany(args: { where: { idempotencyKey: string; status: string } }) {
            const row = rows.get(args.where.idempotencyKey);
            if (row?.status === args.where.status) {
                rows.delete(args.where.idempotencyKey);
                return { count: 1 };
            }
            return { count: 0 };
        },
    };

    return {
        client: { productionActuationIdempotency: model } as unknown as PrismaClient,
    };
}

async function main(): Promise<void> {
    const { client } = fakeDatabase();
    const step = makeStep();
    const key = "v1/COMPANY:company-a/phase5-durable-restart/durable-restart-step";
    let providerCalls = 0;

    const firstProcess = new PrismaActuationIdempotencyStore(client);
    const initialClaim = await firstProcess.claim(key, step);
    if (initialClaim.status !== "ACQUIRED") {
        throw new Error(`Expected initial durable claim ACQUIRED, got ${initialClaim.status}.`);
    }

    providerCalls += 1;
    const successful: ProductionActuationResult = {
        allowed: true,
        boundary: "V6_EXECUTION_AUTHORITY",
        context: {
            workflowId: step.workflowId ?? "phase5-durable-restart",
            stepId: step.id,
            capability: step.capability,
        },
        result: {
            success: true,
            summary: "Synthetic durable actuation completed.",
            completedAt: new Date().toISOString(),
            executionStatus: "verified",
            verified: true,
            executed: true,
            evidence: {
                provider: "phase5-durable-test",
                externalId: "durable-external-001",
            },
        },
    };

    await firstProcess.complete(key, successful, "COMPLETED");

    // A new store instance simulates a restarted process with no in-memory state.
    const restartedProcess = new PrismaActuationIdempotencyStore(client);
    const replay = await restartedProcess.claim(key, step);

    if (replay.status !== "COMPLETED") {
        throw new Error(`Fresh process failed to recover durable completion: ${replay.status}.`);
    }
    if (replay.result.result?.evidence?.externalId !== "durable-external-001") {
        throw new Error("Fresh process did not recover the original provider evidence.");
    }

    const crashKey = "v1/COMPANY:company-a/phase5-durable-crash/crash-step";
    const processBeforeCrash = new PrismaActuationIdempotencyStore(client);
    const crashClaim = await processBeforeCrash.claim(crashKey, {
        ...step,
        id: "crash-step",
        workflowId: "phase5-durable-crash",
    });
    if (crashClaim.status !== "ACQUIRED") {
        throw new Error(`Expected pre-crash claim ACQUIRED, got ${crashClaim.status}.`);
    }

    // Do not complete the claim: this simulates process death while status is IN_FLIGHT.
    const afterRestart = new PrismaActuationIdempotencyStore(client);
    const interruptedReplay = await afterRestart.claim(crashKey, {
        ...step,
        id: "crash-step",
        workflowId: "phase5-durable-crash",
    });

    if (interruptedReplay.status !== "UNKNOWN") {
        throw new Error(`Interrupted durable claim must fail closed as UNKNOWN, got ${interruptedReplay.status}.`);
    }
    if (providerCalls !== 1) {
        throw new Error(`Durable replay caused an extra provider call: ${providerCalls}.`);
    }

    // Failure injection: a DB write may fail before commit or commit but lose
    // its response. In both cases local waiters must settle UNKNOWN, never hang.
    async function verifyPersistenceFailure(
        mode: "before-commit" | "after-commit",
        failureKey: string,
        disposition: "COMPLETED" | "UNKNOWN" = "COMPLETED",
    ): Promise<void> {
        const { client: failureClient } = fakeDatabase(mode);
        const ownerStore = new PrismaActuationIdempotencyStore(failureClient);
        const owner = await ownerStore.claim(failureKey, step);
        if (owner.status !== "ACQUIRED") {
            throw new Error(`Failure test ${mode}: expected ACQUIRED, got ${owner.status}.`);
        }

        const concurrent = await ownerStore.claim(failureKey, step);
        if (concurrent.status !== "IN_FLIGHT") {
            throw new Error(`Failure test ${mode}: expected concurrent IN_FLIGHT waiter, got ${concurrent.status}.`);
        }

        let completionRejected = false;
        try {
            await ownerStore.complete(failureKey, successful, disposition);
        } catch {
            completionRejected = true;
        }
        if (!completionRejected) {
            throw new Error(`Failure test ${mode}: injected persistence error was not surfaced.`);
        }

        const waiterResult = await concurrent.completion;
        if (waiterResult.result || !waiterResult.reason?.includes("reconciliation")) {
            throw new Error(`Failure test ${mode}: waiter was not resolved with fail-closed UNKNOWN.`);
        }

        const restarted = new PrismaActuationIdempotencyStore(failureClient);
        const recovered = await restarted.claim(failureKey, step);
        if (mode === "after-commit" && disposition === "COMPLETED") {
            if (recovered.status !== "COMPLETED" ||
                recovered.result.result?.evidence?.externalId !== "durable-external-001") {
                throw new Error("Commit-then-throw must preserve the durable completed result and provider evidence.");
            }
        } else if (recovered.status !== "UNKNOWN") {
            throw new Error(`Pre-commit failure must leave an interrupted claim blocked as UNKNOWN, got ${recovered.status}.`);
        }
    }

    await verifyPersistenceFailure("before-commit", "v1/COMPANY:company-a/phase5-ledger-failure/before");
    await verifyPersistenceFailure("after-commit", "v1/COMPANY:company-a/phase5-ledger-failure/after");
    await verifyPersistenceFailure(
        "before-commit",
        "v1/COMPANY:company-a/phase5-ledger-failure/unknown",
        "UNKNOWN",
    );

    // Governance regression: provider returned success but the ledger write
    // failed. The caller must see UNKNOWN with evidence and the gate must not
    // issue a second write that could overwrite an ambiguously committed row.
    const registry = new InMemoryProductionActuatorRegistry();
    let actuatorCalls = 0;
    registry.register({
        id: "phase5-ledger-failure-test-actuator",
        capabilities: ["email.send"],
        async execute() {
            actuatorCalls += 1;
            return {
                success: true,
                summary: "Synthetic provider success; no external provider was called.",
                completedAt: new Date().toISOString(),
                executionStatus: "verified" as const,
                executed: true,
                verified: true,
                evidence: {
                    provider: "phase5-ledger-failure-test",
                    externalId: "provider-accepted-before-ledger-failure",
                },
            };
        },
    });

    let completeCalls = 0;
    const failingLedger: ActuationIdempotencyStore = {
        async claim() {
            return { status: "ACQUIRED" };
        },
        async complete() {
            completeCalls += 1;
            throw new Error("Injected ledger outage after provider result.");
        },
    };
    const governance = new GuardedProductionActuation(
        new ProductionActuatorComposition(registry),
        new CapabilityAgentAuthorizationPolicy(new Map([
            ["email.send", new Set(["sales"])],
        ])),
        new StaticActuationControl(true),
        failingLedger,
    );
    const governedStep = { ...step, workflowId: "phase5-governance-ledger-failure" };
    const governedResult = await governance.dispatch(governedStep);
    if (governedResult.outcome !== "UNKNOWN") {
        throw new Error(`Provider success with ledger failure must return UNKNOWN, got ${governedResult.outcome}.`);
    }
    if (governedResult.result?.evidence?.externalId !== "provider-accepted-before-ledger-failure") {
        throw new Error("Governance failure path discarded provider evidence.");
    }
    if (actuatorCalls !== 1 || completeCalls !== 1) {
        throw new Error(`Unsafe governance retry detected: actuatorCalls=${actuatorCalls}, completeCalls=${completeCalls}.`);
    }

    console.log("");
    console.log("PHASE 5.4-F — DURABLE IDEMPOTENCY / PROCESS RESTART");
    console.log("Completed result survives fresh store : PASS");
    console.log("Original external ID recovered        : PASS");
    console.log("Interrupted claim after restart       : UNKNOWN / BLOCKED");
    console.log("Provider calls in successful replay   :", providerCalls);
    console.log("Automatic replay after interrupted claim: BLOCKED");
    console.log("Waiters settle after persistence failures: PASS");
    console.log("Commit-then-throw preserves durable result: PASS");
    console.log("Pre-commit failure remains blocked as UNKNOWN: PASS");
    console.log("Governance preserves provider evidence on ledger failure: PASS");
    console.log("Governance does not retry ambiguous persistence: PASS");
    console.log("PHASE 5.4-F DURABLE RESTART / LEDGER FAILURE SAFETY: PASS");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
