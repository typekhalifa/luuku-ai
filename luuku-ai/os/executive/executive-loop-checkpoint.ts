import type { ExecutionOwnership } from "../../orchestration/ownership.js";

export interface ExecutiveLoopCheckpoint {
    readonly version: number;
    readonly ownership?: ExecutionOwnership;
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
    private checkpoint: ExecutiveLoopCheckpoint;
    private readonly ownership: ExecutionOwnership;

    constructor(ownership?: ExecutionOwnership) {
        this.ownership = ownership ?? { scope: "SYSTEM" };
        this.checkpoint = {
            version: 1,
            ownership: this.ownership,
            handledIntentKeys: [],
            cycleCount: 0,
            updatedAt: new Date(0),
        };
    }

    async load(): Promise<ExecutiveLoopCheckpoint> {
        return {
            ...this.checkpoint,
            handledIntentKeys: [...this.checkpoint.handledIntentKeys],
        };
    }

    async save(checkpoint: ExecutiveLoopCheckpoint): Promise<void> {
        const ownership = checkpoint.ownership ?? { scope: "SYSTEM" as const };
        if (
            ownership.scope !== this.ownership.scope ||
            (ownership.scope === "COMPANY" && this.ownership.scope === "COMPANY" && ownership.companyId !== this.ownership.companyId)
        ) {
            throw new Error("Executive checkpoint ownership mismatch.");
        }

        this.checkpoint = {
            ...checkpoint,
            ownership: this.ownership,
            handledIntentKeys: [...checkpoint.handledIntentKeys],
        };
    }
}
