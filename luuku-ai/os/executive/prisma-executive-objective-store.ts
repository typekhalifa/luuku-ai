import { prisma } from "../../shared/database/client.js";
import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../orchestration/ownership.js";
import type {
    ExecutiveObjectiveRecord,
    ExecutiveObjectiveStore,
} from "./objective-engine.js";

const toRecord = (record: {
    id: string;
    ownershipScope: string;
    companyId: string | null;
    title: string;
    description: string;
    priority: string;
    status: string;
    progress: number;
    previousProgress: number | null;
    deadlineAt: Date | null;
    staleAfterDays: number | null;
    createdAt: Date;
    updatedAt: Date;
}): ExecutiveObjectiveRecord => {
    if (!["high", "medium", "low"].includes(record.priority)) {
        throw new Error(`Invalid executive objective priority: ${record.priority}`);
    }
    if (!["ACTIVE", "PAUSED", "COMPLETED"].includes(record.status)) {
        throw new Error(`Invalid executive objective status: ${record.status}`);
    }

    const ownership: ExecutionOwnership =
        record.ownershipScope === "COMPANY" && record.companyId
            ? { scope: "COMPANY", companyId: record.companyId }
            : record.ownershipScope === "SYSTEM" && record.companyId === null
                ? { scope: "SYSTEM" }
                : (() => { throw new Error("Invalid persisted executive objective ownership."); })();

    return {
        id: record.id,
        ownership,
        title: record.title,
        description: record.description,
        priority: record.priority as ExecutiveObjectiveRecord["priority"],
        status: record.status as ExecutiveObjectiveRecord["status"],
        progress: record.progress,
        ...(record.previousProgress !== null ? { previousProgress: record.previousProgress } : {}),
        ...(record.deadlineAt !== null ? { deadlineAt: record.deadlineAt } : {}),
        ...(record.staleAfterDays !== null ? { staleAfterDays: record.staleAfterDays } : {}),
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
};

export class PrismaExecutiveObjectiveStore implements ExecutiveObjectiveStore {
    private readonly ownership: ExecutionOwnership;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = normalizeExecutionOwnership(ownership);
    }

    async get(id: string): Promise<ExecutiveObjectiveRecord | undefined> {
        const record = await prisma.executiveObjective.findFirst({
            where: {
                id,
                ...ownershipWhere(this.ownership),
            },
        });
        return record ? toRecord(record) : undefined;
    }

    async list(): Promise<readonly ExecutiveObjectiveRecord[]> {
        const records = await prisma.executiveObjective.findMany({
            where: ownershipWhere(this.ownership),
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        });
        return records.map(toRecord);
    }

    async save(objective: ExecutiveObjectiveRecord): Promise<void> {
        const normalizedOwnership = normalizeExecutionOwnership(objective.ownership);
        if (!ownershipMatches(this.ownership, normalizedOwnership)) {
            throw new Error("Executive objective ownership mismatch.");
        }

        const existing = await prisma.executiveObjective.findUnique({
            where: { id: objective.id },
            select: { ownershipScope: true, companyId: true },
        });
        if (existing) {
            const existingOwnership = parseOwnership(existing.ownershipScope, existing.companyId);
            if (!ownershipMatches(this.ownership, existingOwnership)) {
                throw new Error("Executive objective ownership mismatch.");
            }
        }

        await prisma.executiveObjective.upsert({
            where: { id: objective.id },
            create: {
                id: objective.id,
                ownershipScope: normalizedOwnership.scope,
                companyId: normalizedOwnership.scope === "COMPANY" ? normalizedOwnership.companyId : null,
                title: objective.title,
                description: objective.description,
                priority: objective.priority,
                status: objective.status,
                progress: objective.progress,
                previousProgress: objective.previousProgress ?? null,
                deadlineAt: objective.deadlineAt ?? null,
                staleAfterDays: objective.staleAfterDays ?? null,
                createdAt: objective.createdAt,
                updatedAt: objective.updatedAt,
            },
            update: {
                title: objective.title,
                description: objective.description,
                priority: objective.priority,
                status: objective.status,
                progress: objective.progress,
                previousProgress: objective.previousProgress ?? null,
                deadlineAt: objective.deadlineAt ?? null,
                staleAfterDays: objective.staleAfterDays ?? null,
                updatedAt: objective.updatedAt,
            },
        });
    }
}

function ownershipWhere(ownership: ExecutionOwnership): {
    ownershipScope: "SYSTEM" | "COMPANY";
    companyId: string | null;
} {
    return ownership.scope === "COMPANY"
        ? { ownershipScope: "COMPANY", companyId: ownership.companyId }
        : { ownershipScope: "SYSTEM", companyId: null };
}

function parseOwnership(scope: string, companyId: string | null): ExecutionOwnership {
    if (scope === "COMPANY" && companyId) return { scope: "COMPANY", companyId };
    if (scope === "SYSTEM" && companyId === null) return { scope: "SYSTEM" };
    throw new Error("Invalid persisted executive objective ownership.");
}
