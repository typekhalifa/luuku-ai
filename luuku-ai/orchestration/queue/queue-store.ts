import { QueueItem, QueueItemStatus } from "./queue";

export interface QueueStore {
    enqueue(item: QueueItem): Promise<QueueItem>;
    get(id: string): Promise<QueueItem | null>;
    claimNext(now: Date): Promise<QueueItem | null>;
    complete(id: string, completedAt?: Date): Promise<QueueItem>;
}

export class InMemoryQueueStore implements QueueStore {
    private readonly items = new Map<string, QueueItem>();

    async enqueue(item: QueueItem): Promise<QueueItem> {
        if (this.items.has(item.id)) {
            throw new Error(`Queue item ${item.id} already exists.`);
        }

        const stored = cloneQueueItem(item);
        this.items.set(item.id, stored);
        return cloneQueueItem(stored);
    }

    async get(id: string): Promise<QueueItem | null> {
        const item = this.items.get(id);
        return item ? cloneQueueItem(item) : null;
    }

    async claimNext(now: Date): Promise<QueueItem | null> {
        const candidates = [...this.items.values()]
            .filter((item) =>
                item.status === QueueItemStatus.QUEUED &&
                item.availableAt.getTime() <= now.getTime(),
            )
            .sort((a, b) => {
                const priorityRank: Record<string, number> = {
                    CRITICAL: 0,
                    HIGH: 1,
                    MEDIUM: 2,
                    LOW: 3,
                };

                return (
                    (priorityRank[a.priority] ?? Number.MAX_SAFE_INTEGER) -
                    (priorityRank[b.priority] ?? Number.MAX_SAFE_INTEGER)
                );
            });

        const next = candidates[0];
        if (!next) return null;

        next.status = QueueItemStatus.CLAIMED;
        next.attempts += 1;
        next.claimedAt = new Date(now);
        this.items.set(next.id, next);

        return cloneQueueItem(next);
    }

    async complete(id: string, completedAt = new Date()): Promise<QueueItem> {
        const item = this.items.get(id);
        if (!item) throw new Error(`Queue item ${id} was not found.`);

        item.status = QueueItemStatus.COMPLETED;
        item.completedAt = new Date(completedAt);
        this.items.set(id, item);

        return cloneQueueItem(item);
    }
}

function cloneQueueItem(item: QueueItem): QueueItem {
    return {
        ...item,
        availableAt: new Date(item.availableAt),
        claimedAt: item.claimedAt ? new Date(item.claimedAt) : undefined,
        completedAt: item.completedAt ? new Date(item.completedAt) : undefined,
        metadata: { ...item.metadata },
    };
}
