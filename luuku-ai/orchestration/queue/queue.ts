import { Priority } from "../task/priority";
import type { ExecutionOwnership } from "../ownership";
import { assertValidExecutionOwnership, ownershipMatches } from "../ownership";

export enum QueueItemStatus {
    QUEUED = "QUEUED",
    CLAIMED = "CLAIMED",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED",
    CANCELLED = "CANCELLED",
}

export interface QueueItem {
    id: string;
    workflowId: string;
    stepId: string;
    agentId: string;
    priority: Priority;
    availableAt: Date;
    status: QueueItemStatus;
    attempts: number;
    metadata: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}

export interface QueueStore {
    enqueue(item: QueueItem): Promise<void>;
    claimNext(now?: Date): Promise<QueueItem | null>;
    complete(id: string, updatedAt?: Date): Promise<void>;
    fail(id: string, updatedAt?: Date): Promise<void>;
    retry(id: string, availableAt: Date): Promise<void>;
    get(id: string): Promise<QueueItem | null>;
    list(): Promise<QueueItem[]>;
    recoverStaleClaims(now: Date, staleAfterMs: number): Promise<string[]>;
}

export class InMemoryQueueStore implements QueueStore {
    constructor(private readonly ownership: ExecutionOwnership) {
        assertValidExecutionOwnership(ownership);
    }

    async enqueue(item: QueueItem): Promise<void> {
        const workflowOwnership = ownershipFromQueueItem(item);
        if (!ownershipMatches(this.ownership, workflowOwnership)) throw new Error("QUEUE_OWNERSHIP_MISMATCH");
        if (this.items.has(item.id)) throw new Error(`Queue item ${item.id} already exists.`);
        this.items.set(item.id, { ...item });
    }

    async claimNext(now = new Date()): Promise<QueueItem | null> {
        const candidates = [...this.items.values()]
            .filter((item) => ownershipMatches(this.ownership, ownershipFromQueueItem(item)))
            .filter((item) => item.status === QueueItemStatus.QUEUED && item.availableAt <= now)
            .sort((a, b) => {
                const priorityRank: Record<Priority, number> = {
                    [Priority.CRITICAL]: 0, [Priority.HIGH]: 1, [Priority.MEDIUM]: 2, [Priority.LOW]: 3,
                };
                return priorityRank[a.priority] - priorityRank[b.priority]
                    || a.availableAt.getTime() - b.availableAt.getTime()
                    || a.createdAt.getTime() - b.createdAt.getTime();
            });
        const item = candidates[0];
        if (!item) return null;
        item.status = QueueItemStatus.CLAIMED;
        item.attempts += 1;
        item.updatedAt = now;
        return { ...item };
    }

    async complete(id: string, updatedAt = new Date()): Promise<void> {
        const item = this.items.get(id);
        if (!item || !ownershipMatches(this.ownership, ownershipFromQueueItem(item))) throw new Error(`Queue item ${id} was not found in the requested ownership scope.`);
        item.status = QueueItemStatus.COMPLETED;
        item.updatedAt = updatedAt;
    }

    async fail(id: string, updatedAt = new Date()): Promise<void> {
        const item = this.items.get(id);
        if (!item || !ownershipMatches(this.ownership, ownershipFromQueueItem(item))) throw new Error(`Queue item ${id} was not found in the requested ownership scope.`);
        item.status = QueueItemStatus.FAILED;
        item.updatedAt = updatedAt;
    }

    async retry(id: string, availableAt: Date): Promise<void> {
        const item = this.items.get(id);
        if (!item || !ownershipMatches(this.ownership, ownershipFromQueueItem(item))) throw new Error(`Queue item ${id} was not found in the requested ownership scope.`);
        if (item.status !== QueueItemStatus.CLAIMED && item.status !== QueueItemStatus.FAILED) throw new Error(`Queue item ${id} is not retryable from ${item.status}.`);
        item.status = QueueItemStatus.QUEUED;
        item.availableAt = availableAt;
        item.updatedAt = availableAt;
    }

    async get(id: string): Promise<QueueItem | null> {
        const item = this.items.get(id);
        return item && ownershipMatches(this.ownership, ownershipFromQueueItem(item)) ? { ...item } : null;
    }

    async list(): Promise<QueueItem[]> {
        return [...this.items.values()]
            .filter((item) => ownershipMatches(this.ownership, ownershipFromQueueItem(item)))
            .map((item) => ({ ...item, metadata: { ...item.metadata } }));
    }

    async recoverStaleClaims(now: Date, staleAfterMs: number): Promise<string[]> {
        const cutoff = now.getTime() - staleAfterMs;
        const recovered: string[] = [];
        for (const item of this.items.values()) {
            if (!ownershipMatches(this.ownership, ownershipFromQueueItem(item))) continue;
            if (item.status !== QueueItemStatus.CLAIMED || item.updatedAt.getTime() > cutoff) continue;
            item.status = QueueItemStatus.QUEUED;
            item.availableAt = now;
            item.updatedAt = now;
            recovered.push(item.id);
        }
        return recovered;
    }

    private readonly items = new Map<string, QueueItem>();
}

function ownershipFromQueueItem(item: QueueItem): ExecutionOwnership {
    const companyId = typeof item.metadata.companyId === "string" ? item.metadata.companyId : undefined;
    return companyId ? { scope: "COMPANY", companyId } : { scope: "SYSTEM" };
}
