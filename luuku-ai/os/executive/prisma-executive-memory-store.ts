import { prisma } from "../../shared/database/client.js";
import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../orchestration/ownership.js";
import type { ExecutiveMemoryRecord, ExecutiveMemoryStore } from "./executive-memory.js";

export class PrismaExecutiveMemoryStore implements ExecutiveMemoryStore {
    private readonly ownership: ExecutionOwnership;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = normalizeExecutionOwnership(ownership);
    }

    async list(): Promise<readonly ExecutiveMemoryRecord[]> {
        const records = await prisma.executiveMemory.findMany({
            where: ownershipWhere(this.ownership),
            orderBy: { createdAt: "asc" },
        });

        return records.map(fromRecord);
    }

    async save(record: ExecutiveMemoryRecord): Promise<void> {
        const normalizedOwnership = normalizeExecutionOwnership(record.ownership);
        if (!ownershipMatches(this.ownership, normalizedOwnership)) {
            throw new Error("Executive memory ownership mismatch.");
        }
        if (record.confidence !== undefined && (record.confidence < 0 || record.confidence > 1)) {
            throw new Error("Memory confidence must be between 0 and 1.");
        }

        await prisma.executiveMemory.create({
            data: {
                id: record.id,
                ownershipScope: normalizedOwnership.scope,
                companyId: normalizedOwnership.scope === "COMPANY" ? normalizedOwnership.companyId : null,
                objectiveId: record.objectiveId,
                workflowId: record.workflowId,
                eventType: record.eventType,
                action: record.action,
                outcome: record.outcome,
                success: record.success,
                lesson: record.lesson,
                confidence: record.confidence,
                createdAt: record.createdAt,
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

function fromRecord(record: {
    id: string;
    ownershipScope: string;
    companyId: string | null;
    objectiveId: string | null;
    workflowId: string | null;
    eventType: string;
    action: string;
    outcome: string;
    success: boolean;
    lesson: string | null;
    confidence: number | null;
    createdAt: Date;
}): ExecutiveMemoryRecord {
    const ownership: ExecutionOwnership =
        record.ownershipScope === "COMPANY" && record.companyId
            ? { scope: "COMPANY", companyId: record.companyId }
            : record.ownershipScope === "SYSTEM" && record.companyId === null
                ? { scope: "SYSTEM" }
                : (() => { throw new Error("Invalid persisted executive memory ownership."); })();

    return {
        id: record.id,
        ownership,
        objectiveId: record.objectiveId ?? undefined,
        workflowId: record.workflowId ?? undefined,
        eventType: record.eventType as ExecutiveMemoryRecord["eventType"],
        action: record.action,
        outcome: record.outcome,
        success: record.success,
        lesson: record.lesson ?? undefined,
        confidence: record.confidence ?? undefined,
        createdAt: record.createdAt,
    };
}
