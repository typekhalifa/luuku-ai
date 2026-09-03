import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/database/client";
import {
    ExecutiveLoopCheckpoint,
    ExecutiveLoopCheckpointStore,
} from "./executive-loop-checkpoint";

const CHECKPOINT_ID = "executive-loop";

export class PrismaExecutiveLoopCheckpointStore implements ExecutiveLoopCheckpointStore {
    async load(): Promise<ExecutiveLoopCheckpoint> {
        const record = await prisma.executiveLoopCheckpoint.findUnique({
            where: { id: CHECKPOINT_ID },
        });

        if (!record) {
            return {
                version: 1,
                handledIntentKeys: [],
                cycleCount: 0,
                updatedAt: new Date(0),
            };
        }

        const handledIntentKeys = Array.isArray(record.handledIntentKeys)
            ? record.handledIntentKeys.filter((value): value is string => typeof value === "string")
            : [];

        return {
            version: record.version,
            handledIntentKeys,
            cycleCount: record.cycleCount,
            updatedAt: record.updatedAt,
        };
    }

    async save(checkpoint: ExecutiveLoopCheckpoint): Promise<void> {
        await prisma.executiveLoopCheckpoint.upsert({
            where: { id: CHECKPOINT_ID },
            create: {
                id: CHECKPOINT_ID,
                version: checkpoint.version,
                handledIntentKeys: checkpoint.handledIntentKeys as unknown as Prisma.InputJsonValue,
                cycleCount: checkpoint.cycleCount,
                updatedAt: checkpoint.updatedAt,
            },
            update: {
                version: checkpoint.version,
                handledIntentKeys: checkpoint.handledIntentKeys as unknown as Prisma.InputJsonValue,
                cycleCount: checkpoint.cycleCount,
                updatedAt: checkpoint.updatedAt,
            },
        });
    }
}
