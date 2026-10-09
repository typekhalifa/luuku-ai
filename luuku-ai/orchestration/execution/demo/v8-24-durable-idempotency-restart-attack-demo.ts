import type { PrismaClient } from "@prisma/client";
import { PrismaActuationIdempotencyStore } from "../prisma-actuation-idempotency-store.js";
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

function fakeDatabase() {
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
            const updated = { ...row, ...args.data, updatedAt: new Date() };
            rows.set(args.where.idempotencyKey, updated);
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
            workflowId: step.workflowId,
            stepId: step.id,
            capability: step.capability,
        },
        result: {
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

    console.log("");
    console.log("PHASE 5.4-F — DURABLE IDEMPOTENCY / PROCESS RESTART");
    console.log("Completed result survives fresh store : PASS");
    console.log("Original external ID recovered        : PASS");
    console.log("Interrupted claim after restart       : UNKNOWN / BLOCKED");
    console.log("Provider calls in successful replay   :", providerCalls);
    console.log("Automatic replay after interrupted claim: BLOCKED");
    console.log("PHASE 5.4-F DURABLE RESTART SAFETY: PASS");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
