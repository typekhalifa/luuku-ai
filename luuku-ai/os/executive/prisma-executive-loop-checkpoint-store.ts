import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/database/client.js";
import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../orchestration/ownership.js";
import {
    type ExecutiveLoopCheckpoint,
    type ExecutiveLoopCheckpointStore,
} from "./executive-loop-checkpoint.js";

export class PrismaExecutiveLoopCheckpointStore implements ExecutiveLoopCheckpointStore {
    private readonly ownership: ExecutionOwnership;
    private readonly checkpointId: string;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = normalizeExecutionOwnership(ownership);
        this.checkpointId = this.ownership.scope === "COMPANY"
            ? `executive-loop:company:${this.ownership.companyId}`
            : "executive-loop:system";
    }

    async load(): Promise<ExecutiveLoopCheckpoint> {
        const record = await prisma.executiveLoopCheckpoint.findUnique({
            where: { id: this.checkpointId },
        });

        if (!record) {
            return {
                version: 1,
                ownership: this.ownership,
                handledIntentKeys: [],
                cycleCount: 0,
                updatedAt: new Date(0),
            };
        }

        const persistedOwnership = parseOwnership(record.ownershipScope, record.companyId);
        if (!ownershipMatches(this.ownership, persistedOwnership)) {
            throw new Error("Executive checkpoint ownership mismatch.");
        }

        const handledIntentKeys = Array.isArray(record.handledIntentKeys)
            ? record.handledIntentKeys.filter((value): value is string => typeof value === "string")
            : [];

        return {
            version: record.version,
            ownership: persistedOwnership,
            handledIntentKeys,
            cycleCount: record.cycleCount,
            updatedAt: record.updatedAt,
        };
    }

    async save(checkpoint: ExecutiveLoopCheckpoint): Promise<void> {
        const checkpointOwnership = normalizeExecutionOwnership(checkpoint.ownership);
        if (!ownershipMatches(this.ownership, checkpointOwnership)) {
            throw new Error("Executive checkpoint ownership mismatch.");
        }

        await prisma.executiveLoopCheckpoint.upsert({
            where: { id: this.checkpointId },
            create: {
                id: this.checkpointId,
                ownershipScope: checkpointOwnership.scope,
                companyId: checkpointOwnership.scope === "COMPANY" ? checkpointOwnership.companyId : null,
                version: checkpoint.version,
                handledIntentKeys: checkpoint.handledIntentKeys as unknown as Prisma.InputJsonValue,
                cycleCount: checkpoint.cycleCount,
                updatedAt: checkpoint.updatedAt,
            },
            update: {
                ownershipScope: checkpointOwnership.scope,
                companyId: checkpointOwnership.scope === "COMPANY" ? checkpointOwnership.companyId : null,
                version: checkpoint.version,
                handledIntentKeys: checkpoint.handledIntentKeys as unknown as Prisma.InputJsonValue,
                cycleCount: checkpoint.cycleCount,
                updatedAt: checkpoint.updatedAt,
            },
        });
    }
}

function parseOwnership(scope: string, companyId: string | null): ExecutionOwnership {
    if (scope === "COMPANY" && companyId) return { scope: "COMPANY", companyId };
    if (scope === "SYSTEM" && companyId === null) return { scope: "SYSTEM" };
    throw new Error("Invalid persisted executive checkpoint ownership.");
}
