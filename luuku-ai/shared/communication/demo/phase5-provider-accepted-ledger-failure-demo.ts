import type { PrismaClient } from "@prisma/client";
import { CommunicationExecutionService } from "../communication-execution.service.js";
import { CommunicationRouter } from "../router.js";
import type { CommunicationAdapter, CommunicationRequest } from "../types.js";

async function main(): Promise<void> {
    let providerCalls = 0;
    let record: Record<string, any> | null = null;
    let failNextCompletion = true;

    // Minimal deterministic Prisma-shaped test double. The provider returns
    // success, but the first local terminal ledger update fails.
    const fakeDb = {
        communicationExecution: {
            async findUnique() {
                return record;
            },
            async create(args: { data: Record<string, any> }) {
                record = {
                    id: "phase5-provider-accepted-ledger-failure",
                    ...args.data,
                };
                return record;
            },
            async update(args: { where: { id: string }; data: Record<string, any> }) {
                if (
                    failNextCompletion &&
                    Object.prototype.hasOwnProperty.call(args.data, "executed")
                ) {
                    failNextCompletion = false;
                    throw new Error("Simulated database failure after provider acceptance.");
                }
                if (!record || record.id !== args.where.id) {
                    throw new Error("Fake execution record not found.");
                }
                record = { ...record, ...args.data };
                return record;
            },
        },
    } as unknown as PrismaClient;

    const executionService = new CommunicationExecutionService(fakeDb);
    const router = new CommunicationRouter(executionService);

    const adapter: CommunicationAdapter = {
        capability: "email.send",
        channel: "internal",
        isAvailable: () => true,
        async execute(request: CommunicationRequest) {
            providerCalls += 1;
            return {
                capability: request.capability,
                channel: request.channel,
                status: "verified",
                executed: true,
                verified: true,
                evidence: {
                    provider: "synthetic-provider",
                    externalId: "provider-accepted-001",
                    details: { providerAccepted: true },
                },
                summary: "Synthetic provider accepted the action.",
            };
        },
    };

    router.register(adapter);

    const request: CommunicationRequest = {
        capability: "email.send",
        channel: "internal",
        recipientExternalId: "synthetic-recipient",
        subject: "Phase 5 local ledger failure",
        body: "Synthetic test only; no external email is sent.",
        metadata: {
            companyId: "phase5-company",
            audience: "internal",
            executionMode: "test",
            idempotencyKey: "phase5/provider-accepted-ledger-failure",
            source: "phase5-provider-accepted-ledger-failure",
        },
    };

    const first = await router.execute(request);

    if (first.status !== "unknown") {
        throw new Error(`Expected UNKNOWN after ledger failure, got ${first.status}.`);
    }
    if (providerCalls !== 1) {
        throw new Error(`Expected one provider call, got ${providerCalls}.`);
    }

    const second = await router.execute(request);

    if (second.status !== "unknown") {
        throw new Error(`Expected UNKNOWN on replay of executing record, got ${second.status}.`);
    }
    if (providerCalls !== 1) {
        throw new Error(`Unsafe replay detected: provider calls=${providerCalls}.`);
    }

    console.log("");
    console.log("PHASE 5.4-E — PROVIDER ACCEPTED, LOCAL LEDGER FAILED");
    console.log("Provider returned acceptance      : PASS");
    console.log("Local terminal persistence failed : SIMULATED");
    console.log("First outcome classified UNKNOWN  :", first.status === "unknown" ? "PASS" : "FAIL");
    console.log("Interrupted ledger replay blocked :", second.status === "unknown" ? "PASS" : "FAIL");
    console.log("Provider calls                    :", providerCalls);
    console.log("Automatic duplicate send           : BLOCKED");
    console.log("PHASE 5.4-E PROVIDER/LEDGER GAP: PASS");
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
