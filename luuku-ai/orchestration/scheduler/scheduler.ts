import { QueueItem, QueueStore } from "../queue/queue";

export interface ScheduleItemInput {
    id: string;
    workflowId: string;
    stepId: string;
    agentId: string;
    availableAt: Date;
    priority: QueueItem["priority"];
    metadata: Record<string, unknown>;
}

export interface Scheduler {
    schedule(input: ScheduleItemInput): Promise<QueueItem>;
}

export class QueueScheduler implements Scheduler {
    constructor(private readonly queue: QueueStore) {}

    async schedule(input: ScheduleItemInput): Promise<QueueItem> {
        const now = new Date();
        const item: QueueItem = {
            ...input,
            status: "QUEUED" as QueueItem["status"],
            attempts: 0,
            createdAt: now,
            updatedAt: now,
        };

        await this.queue.enqueue(item);
        return item;
    }
}
