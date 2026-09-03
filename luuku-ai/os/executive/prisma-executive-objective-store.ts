import { prisma } from "../../shared/database/client.js";
import type {
    ExecutiveObjectiveRecord,
    ExecutiveObjectiveStore,
} from "./objective-engine.js";

const toRecord = (record: {
    id: string;
    title: string;
    description: string;
    priority: string;
    status: string;
    progress: number;
    createdAt: Date;
    updatedAt: Date;
}): ExecutiveObjectiveRecord => {
    if (!["high", "medium", "low"].includes(record.priority)) {
        throw new Error(`Invalid executive objective priority: ${record.priority}`);
    }
    if (!["ACTIVE", "PAUSED", "COMPLETED"].includes(record.status)) {
        throw new Error(`Invalid executive objective status: ${record.status}`);
    }

    return {
        id: record.id,
        title: record.title,
        description: record.description,
        priority: record.priority as ExecutiveObjectiveRecord["priority"],
        status: record.status as ExecutiveObjectiveRecord["status"],
        progress: record.progress,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
    };
};

export class PrismaExecutiveObjectiveStore implements ExecutiveObjectiveStore {
    async get(id: string): Promise<ExecutiveObjectiveRecord | undefined> {
        const record = await prisma.executiveObjective.findUnique({ where: { id } });
        return record ? toRecord(record) : undefined;
    }

    async list(): Promise<readonly ExecutiveObjectiveRecord[]> {
        const records = await prisma.executiveObjective.findMany({
            orderBy: [{ priority: "asc" }, { createdAt: "asc" }],
        });
        return records.map(toRecord);
    }

    async save(objective: ExecutiveObjectiveRecord): Promise<void> {
        await prisma.executiveObjective.upsert({
            where: { id: objective.id },
            create: {
                id: objective.id,
                title: objective.title,
                description: objective.description,
                priority: objective.priority,
                status: objective.status,
                progress: objective.progress,
                createdAt: objective.createdAt,
                updatedAt: objective.updatedAt,
            },
            update: {
                title: objective.title,
                description: objective.description,
                priority: objective.priority,
                status: objective.status,
                progress: objective.progress,
                updatedAt: objective.updatedAt,
            },
        });
    }
}
