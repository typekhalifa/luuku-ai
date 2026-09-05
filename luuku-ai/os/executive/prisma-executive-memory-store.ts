import { prisma } from "../../shared/database/client";
import type { ExecutiveMemoryRecord, ExecutiveMemoryStore } from "./executive-memory";

export class PrismaExecutiveMemoryStore implements ExecutiveMemoryStore {
    async list(): Promise<readonly ExecutiveMemoryRecord[]> {
        const records = await prisma.executiveMemory.findMany({
            orderBy: { createdAt: "asc" },
        });

        return records.map(fromRecord);
    }

    async save(record: ExecutiveMemoryRecord): Promise<void> {
        if (record.confidence !== undefined && (record.confidence < 0 || record.confidence > 1)) {
            throw new Error("Memory confidence must be between 0 and 1.");
        }

        await prisma.executiveMemory.create({
            data: {
                id: record.id,
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

function fromRecord(record: {
    id: string;
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
    return {
        id: record.id,
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
