import { prisma } from "../../shared/database/client";
import type {
    InstitutionalMemoryRecord,
    InstitutionalMemoryStore,
} from "./v8-l-institutional-memory";

const toRecord = (row: {
    id: string;
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

/**
 * Durable institutional-memory adapter backed by Prisma/PostgreSQL.
 *
 * This adapter only persists and retrieves institutional knowledge. It does
 * not infer truth, alter objectives, approve work, allocate resources, select
 * agents, or execute anything. V6 remains the sole execution authority.
 */
export class PrismaInstitutionalMemoryStore implements InstitutionalMemoryStore {
    async list(): Promise<readonly InstitutionalMemoryRecord[]> {
        const rows = await prisma.executiveInstitutionalMemory.findMany({
            orderBy: [
                { lastConfirmedAt: "desc" },
                { id: "asc" },
            ],
        });

        return rows.map(toRecord);
    }

    async save(record: InstitutionalMemoryRecord): Promise<void> {
        await prisma.executiveInstitutionalMemory.create({
            data: {
                id: record.id,
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
