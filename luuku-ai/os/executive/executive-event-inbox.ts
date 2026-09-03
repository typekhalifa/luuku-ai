export type ExecutiveEventInboxStatus = "PENDING" | "PROCESSING" | "DELIVERED" | "FAILED";

export interface ExecutiveEventInboxRecord {
    readonly id: string;
    readonly type: string;
    readonly occurredAt: Date;
    readonly metadata?: Readonly<Record<string, unknown>>;
    readonly status: ExecutiveEventInboxStatus;
    readonly attempts: number;
    readonly processingStartedAt?: Date;
    readonly deliveredAt?: Date;
    readonly lastError?: string;
    readonly createdAt: Date;
    readonly updatedAt: Date;
}

export interface ExecutiveEventInboxStore {
    receive(event: ExecutiveEventInboxRecord): Promise<"RECEIVED" | "DUPLICATE">;
    claimNext(now: Date, staleAfterMs: number): Promise<ExecutiveEventInboxRecord | undefined>;
    markDelivered(id: string, deliveredAt: Date): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
}
