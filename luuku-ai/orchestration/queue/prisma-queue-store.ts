import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/database/client";
import { Priority } from "../task/priority";
import { QueueItem, QueueItemStatus, QueueStore } from "./queue";

const priorityRank: Record<Priority, number> = {
    [Priority.CRITICAL]: 0, [Priority.HIGH]: 1, [Priority.MEDIUM]: 2, [Priority.LOW]: 3,
};

export class PrismaQueueStore implements QueueStore {
    async enqueue(item: QueueItem): Promise<void> { await prisma.queueItem.create({ data: toCreateData(item) }); }
    async claimNext(now = new Date()): Promise<QueueItem | null> {
        const candidates = await prisma.queueItem.findMany({ where: { status: QueueItemStatus.QUEUED, availableAt: { lte: now } }, orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }] });
        candidates.sort((a, b) => priorityRank[a.priority as Priority] - priorityRank[b.priority as Priority] || a.availableAt.getTime() - b.availableAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime());
        const candidate = candidates[0]; if (!candidate) return null;
        const claimed = await prisma.queueItem.updateMany({ where: { id: candidate.id, status: QueueItemStatus.QUEUED, availableAt: { lte: now } }, data: { status: QueueItemStatus.CLAIMED, attempts: { increment: 1 }, updatedAt: now } });
        if (claimed.count === 0) return null;
        const result = await prisma.queueItem.findUnique({ where: { id: candidate.id } }); return result ? fromRecord(result) : null;
    }
    async complete(id: string, updatedAt = new Date()): Promise<void> { const result = await prisma.queueItem.updateMany({ where: { id }, data: { status: QueueItemStatus.COMPLETED, updatedAt } }); if (!result.count) throw new Error(`Queue item ${id} was not found.`); }
    async fail(id: string, updatedAt = new Date()): Promise<void> { const result = await prisma.queueItem.updateMany({ where: { id }, data: { status: QueueItemStatus.FAILED, updatedAt } }); if (!result.count) throw new Error(`Queue item ${id} was not found.`); }
    async retry(id: string, availableAt: Date): Promise<void> {
        const result = await prisma.queueItem.updateMany({ where: { id, status: { in: [QueueItemStatus.CLAIMED, QueueItemStatus.FAILED] } }, data: { status: QueueItemStatus.QUEUED, availableAt, updatedAt: availableAt } });
        if (!result.count) throw new Error(`Queue item ${id} is not retryable or was not found.`);
    }
    async get(id: string): Promise<QueueItem | null> { const item = await prisma.queueItem.findUnique({ where: { id } }); return item ? fromRecord(item) : null; }
    async list(): Promise<QueueItem[]> { const items = await prisma.queueItem.findMany({ orderBy: { createdAt: "asc" } }); return items.map(fromRecord); }
    async recoverStaleClaims(now: Date, staleAfterMs: number): Promise<string[]> {
        if (staleAfterMs < 0) throw new Error("staleAfterMs must be non-negative.");
        const cutoff = new Date(now.getTime() - staleAfterMs);
        const stale = await prisma.queueItem.findMany({ where: { status: QueueItemStatus.CLAIMED, updatedAt: { lte: cutoff } }, select: { id: true } });
        const recovered: string[] = [];
        for (const item of stale) {
            const result = await prisma.queueItem.updateMany({ where: { id: item.id, status: QueueItemStatus.CLAIMED, updatedAt: { lte: cutoff } }, data: { status: QueueItemStatus.QUEUED, availableAt: now, updatedAt: now } });
            if (result.count === 1) recovered.push(item.id);
        }
        return recovered;
    }
}

function toCreateData(item: QueueItem) { return { id: item.id, workflowId: item.workflowId, stepId: item.stepId, agentId: item.agentId, priority: item.priority, availableAt: item.availableAt, status: item.status, attempts: item.attempts, metadata: item.metadata as Prisma.InputJsonValue, createdAt: item.createdAt, updatedAt: item.updatedAt }; }
function fromRecord(record: { id: string; workflowId: string; stepId: string; agentId: string; priority: string; availableAt: Date; status: string; attempts: number; metadata: Prisma.JsonValue; createdAt: Date; updatedAt: Date; }): QueueItem {
    return { id: record.id, workflowId: record.workflowId, stepId: record.stepId, agentId: record.agentId, priority: record.priority as Priority, availableAt: record.availableAt, status: record.status as QueueItemStatus, attempts: record.attempts, metadata: (record.metadata ?? {}) as Record<string, unknown>, createdAt: record.createdAt, updatedAt: record.updatedAt };
}
