export type ExecutiveMemoryEventType =
    | "ACTION_STARTED"
    | "ACTION_COMPLETED"
    | "ACTION_FAILED"
    | "DECISION_APPROVED"
    | "DECISION_REJECTED"
    | "OBJECTIVE_PROGRESS"
    | "INTERVENTION";

export interface ExecutiveMemoryRecord {
    readonly id: string;
    readonly objectiveId?: string;
    readonly workflowId?: string;
    readonly eventType: ExecutiveMemoryEventType;
    readonly action: string;
    readonly outcome: string;
    readonly success: boolean;
    readonly lesson?: string;
    readonly confidence?: number;
    readonly createdAt: Date;
}

export interface ExecutiveMemoryStore {
    list(): Promise<readonly ExecutiveMemoryRecord[]>;
    save(record: ExecutiveMemoryRecord): Promise<void>;
}

export type ExecutiveLearningPattern = "SUCCESS_PATTERN" | "FAILURE_PATTERN" | "REPEATED_FAILURE" | "LESSON";

export interface ExecutiveLearningRecord {
    readonly pattern: ExecutiveLearningPattern;
    readonly action: string;
    readonly objectiveIds: readonly string[];
    readonly occurrences: number;
    readonly successfulOccurrences: number;
    readonly failedOccurrences: number;
    readonly confidence: number;
    readonly lesson?: string;
}

export class InMemoryExecutiveMemoryStore implements ExecutiveMemoryStore {
    private readonly records = new Map<string, ExecutiveMemoryRecord>();

    async list(): Promise<readonly ExecutiveMemoryRecord[]> {
        return structuredClone([...this.records.values()]);
    }

    async save(record: ExecutiveMemoryRecord): Promise<void> {
        if (this.records.has(record.id)) throw new Error(`Memory record ${record.id} already exists.`);
        if (record.confidence !== undefined && (record.confidence < 0 || record.confidence > 1)) {
            throw new Error("Memory confidence must be between 0 and 1.");
        }
        this.records.set(record.id, structuredClone(record));
    }
}

/** Converts durable experience into deterministic, inspectable learning evidence. */
export class ExecutiveLearningEngine {
    constructor(private readonly store: ExecutiveMemoryStore) {}

    async learn(): Promise<readonly ExecutiveLearningRecord[]> {
        const records = await this.store.list();
        const byAction = new Map<string, ExecutiveMemoryRecord[]>();

        for (const record of records) {
            const existing = byAction.get(record.action) ?? [];
            existing.push(record);
            byAction.set(record.action, existing);
        }

        return [...byAction.entries()].map(([action, actionRecords]) => {
            const successfulOccurrences = actionRecords.filter((record) => record.success).length;
            const failedOccurrences = actionRecords.length - successfulOccurrences;
            const confidence = actionRecords.length === 0 ? 0 : successfulOccurrences / actionRecords.length;
            const repeatedFailure = failedOccurrences >= 2 && failedOccurrences > successfulOccurrences;
            const lesson = actionRecords.find((record) => record.lesson)?.lesson;
            const objectiveIds = [...new Set(actionRecords.map((record) => record.objectiveId).filter((id): id is string => id !== undefined))].sort();

            let pattern: ExecutiveLearningPattern;
            if (repeatedFailure) pattern = "REPEATED_FAILURE";
            else if (failedOccurrences > successfulOccurrences) pattern = "FAILURE_PATTERN";
            else if (successfulOccurrences > 0) pattern = "SUCCESS_PATTERN";
            else pattern = "LESSON";

            return {
                pattern,
                action,
                objectiveIds,
                occurrences: actionRecords.length,
                successfulOccurrences,
                failedOccurrences,
                confidence,
                lesson,
            };
        }).sort((left, right) => left.action.localeCompare(right.action));
    }
}
