export interface ExecutiveLoopCheckpoint {
    readonly version: number;
    readonly handledIntentKeys: readonly string[];
    readonly cycleCount: number;
    readonly updatedAt: Date;
}

export interface ExecutiveLoopCheckpointStore {
    load(): Promise<ExecutiveLoopCheckpoint>;
    save(checkpoint: ExecutiveLoopCheckpoint): Promise<void>;
}

/** Deterministic checkpoint key: the intent type plus its stable source evidence. */
export function intentCheckpointKey(intent: {
    type: string;
    evidence: Record<string, unknown>;
}): string {
    const evidence = intent.type === "RECOVER_FAILED_WORK"
        ? { failedWorkIds: [...((intent.evidence.failedWorkIds as string[] | undefined) ?? [])].sort() }
        : intent.evidence;

    return `${intent.type}:${JSON.stringify(evidence)}`;
}

export class InMemoryExecutiveLoopCheckpointStore implements ExecutiveLoopCheckpointStore {
    private checkpoint: ExecutiveLoopCheckpoint = {
        version: 1,
        handledIntentKeys: [],
        cycleCount: 0,
        updatedAt: new Date(0),
    };

    async load(): Promise<ExecutiveLoopCheckpoint> {
        return {
            ...this.checkpoint,
            handledIntentKeys: [...this.checkpoint.handledIntentKeys],
        };
    }

    async save(checkpoint: ExecutiveLoopCheckpoint): Promise<void> {
        this.checkpoint = {
            ...checkpoint,
            handledIntentKeys: [...checkpoint.handledIntentKeys],
        };
    }
}
