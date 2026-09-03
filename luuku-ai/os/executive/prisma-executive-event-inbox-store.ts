import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/database/client";
import type {
    ExecutiveEventInboxRecord,
    ExecutiveEventInboxStore,
} from "./executive-event-inbox.js";

const toRecord = (record: {
    id: string;
    type: string;
    occurredAt: Date;
    metadata: Prisma.JsonValue | null;
    status: string;
    attempts: number;
    processingStartedAt: Date | null;
    deliveredAt: Date | null;
    lastError: string | null;
    createdAt: Date;
    updatedAt: Date;
}): ExecutiveEventInboxRecord => ({
    id: record.id,
    type: record.type,
    occurredAt: record.occurredAt,
    metadata: record.metadata && typeof record.metadata === "object" && !Array.isArray(record.metadata)
        ? record.metadata as Readonly<Record<string, unknown>>
        : undefined,
    status: record.status as ExecutiveEventInboxRecord["status"],
    attempts: record.attempts,
    processingStartedAt: record.processingStartedAt ?? undefined,
    deliveredAt: record.deliveredAt ?? undefined,
    lastError: record.lastError ?? undefined,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
});

export class PrismaExecutiveEventInboxStore implements ExecutiveEventInboxStore {
    async receive(event: ExecutiveEventInboxRecord): Promise<"RECEIVED" | "DUPLICATE"> {
        try {
            await prisma.executiveEventInbox.create({
                data: {
                    id: event.id,
                    type: event.type,
                    occurredAt: event.occurredAt,
                    metadata: event.metadata as Prisma.InputJsonValue | undefined,
                    status: "PENDING",
                    attempts: 0,
                    processingStartedAt: null,
                    deliveredAt: null,
                    lastError: null,
                    createdAt: event.createdAt,
                    updatedAt: event.updatedAt,
                },
            });
            return "RECEIVED";
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
                return "DUPLICATE";
            }
            throw error;
        }
    }

    async claimNext(now: Date, staleAfterMs: number): Promise<ExecutiveEventInboxRecord | undefined> {
        if (!Number.isFinite(staleAfterMs) || staleAfterMs < 1) {
            throw new Error("staleAfterMs must be at least 1 millisecond.");
        }

        const staleBefore = new Date(now.getTime() - staleAfterMs);
        const candidate = await prisma.executiveEventInbox.findFirst({
            where: {
                OR: [
                    { status: "PENDING" },
                    { status: "PROCESSING", processingStartedAt: { lt: staleBefore } },
                ],
            },
            orderBy: [
                { occurredAt: "asc" },
                { createdAt: "asc" },
            ],
        });

        if (!candidate) return undefined;

        const claimed = await prisma.executiveEventInbox.updateMany({
            where: {
                id: candidate.id,
                OR: [
                    { status: "PENDING" },
                    { status: "PROCESSING", processingStartedAt: { lt: staleBefore } },
                ],
            },
            data: {
                status: "PROCESSING",
                attempts: { increment: 1 },
                processingStartedAt: now,
                lastError: null,
                updatedAt: now,
            },
        });

        if (claimed.count !== 1) return undefined;

        const record = await prisma.executiveEventInbox.findUnique({
            where: { id: candidate.id },
        });

        return record ? toRecord(record) : undefined;
    }

    async markDelivered(id: string, deliveredAt: Date): Promise<void> {
        await prisma.executiveEventInbox.update({
            where: { id },
            data: {
                status: "DELIVERED",
                deliveredAt,
                processingStartedAt: null,
                lastError: null,
                updatedAt: deliveredAt,
            },
        });
    }

    async markFailed(id: string, error: string): Promise<void> {
        const now = new Date();
        await prisma.executiveEventInbox.update({
            where: { id },
            data: {
                status: "FAILED",
                processingStartedAt: null,
                lastError: error,
                updatedAt: now,
            },
        });
    }
}
