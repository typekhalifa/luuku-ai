import { prisma } from "../../shared/database/client.js";
import { normalizeExecutionOwnership, ownershipMatches, type ExecutionOwnership } from "../../orchestration/ownership.js";
import type {
    InstitutionalMemoryRecord,
    InstitutionalMemoryStore,
} from "./v8-l-institutional-memory.js";

const toRecord = (row: {
    id: string;
    ownershipScope: string;
    companyId: string | null;
    kind: string;
    subject: string;
    statement: string;
    confidence: number;
    evidenceIds: string[];
    objectiveIds: string[];
    active: boolean;
    firstObservedAt: Date;
    lastConfirmedAt: Date;
}): InstitutionalMemoryRecord => ({
    id: row.id,
    ownership: parseOwnership(row.ownershipScope, row.companyId),
    kind: row.kind as InstitutionalMemoryRecord["kind"],
    subject: row.subject,
    statement: row.statement,
    confidence: row.confidence,
    evidenceIds: [...row.evidenceIds],
    objectiveIds: [...row.objectiveIds],
    active: row.active,
    firstObservedAt: new Date(row.firstObservedAt),
    lastConfirmedAt: new Date(row.lastConfirmedAt),
});

export class PrismaInstitutionalMemoryStore implements InstitutionalMemoryStore {
    private readonly ownership: ExecutionOwnership;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = normalizeExecutionOwnership(ownership);
    }

    async list(): Promise<readonly InstitutionalMemoryRecord[]> {
        const rows = await prisma.executiveInstitutionalMemory.findMany({
            where: ownershipWhere(this.ownership),
            orderBy: [
                { lastConfirmedAt: "desc" },
                { id: "asc" },
            ],
        });

        return rows.map(toRecord);
    }

    async save(record: InstitutionalMemoryRecord): Promise<void> {
        const normalizedOwnership = normalizeExecutionOwnership(record.ownership);
        if (!ownershipMatches(this.ownership, normalizedOwnership)) {
            throw new Error("Institutional memory ownership mismatch.");
        }

        await prisma.executiveInstitutionalMemory.create({
            data: {
                id: record.id,
                ownershipScope: normalizedOwnership.scope,
                companyId: normalizedOwnership.scope === "COMPANY" ? normalizedOwnership.companyId : null,
                kind: record.kind,
                subject: record.subject,
                statement: record.statement,
                confidence: record.confidence,
                evidenceIds: [...record.evidenceIds],
                objectiveIds: [...record.objectiveIds],
                active: record.active,
                firstObservedAt: record.firstObservedAt,
                lastConfirmedAt: record.lastConfirmedAt,
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
    throw new Error("Invalid persisted institutional memory ownership.");
}
