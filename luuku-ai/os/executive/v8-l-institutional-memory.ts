export type InstitutionalMemoryKind =
    | "FACT"
    | "BELIEF"
    | "LESSON"
    | "DECISION"
    | "COMMITMENT"
    | "RISK";

export interface InstitutionalMemoryRecord {
    readonly id: string;
    readonly kind: InstitutionalMemoryKind;
    readonly subject: string;
    readonly statement: string;
    readonly confidence: number;
    readonly evidenceIds: readonly string[];
    readonly objectiveIds: readonly string[];
    readonly active: boolean;
    readonly firstObservedAt: Date;
    readonly lastConfirmedAt: Date;
}

export interface InstitutionalMemoryStore {
    list(): Promise<readonly InstitutionalMemoryRecord[]>;
    save(record: InstitutionalMemoryRecord): Promise<void>;
}

export interface InstitutionalMemoryCandidate {
    readonly id: string;
    readonly kind: InstitutionalMemoryKind;
    readonly subject: string;
    readonly statement: string;
    readonly confidence: number;
    readonly evidenceIds?: readonly string[];
    readonly objectiveIds?: readonly string[];
    readonly observedAt?: Date;
}

export interface InstitutionalMemoryRecallQuery {
    readonly text: string;
    readonly kinds?: readonly InstitutionalMemoryKind[];
    readonly minConfidence?: number;
    readonly limit?: number;
}

export interface InstitutionalMemoryRecallResult {
    readonly records: readonly InstitutionalMemoryRecord[];
    readonly matched: number;
}

const normalize = (value: string): string =>
    value.trim().toLowerCase().replace(/\s+/g, " ");

const tokens = (value: string): readonly string[] =>
    [...new Set(normalize(value).split(/[^a-z0-9]+/).filter((token) => token.length >= 2))];

const scoreMatch = (query: string, record: InstitutionalMemoryRecord): number => {
    const queryTokens = tokens(query);
    if (queryTokens.length === 0) return 0;

    const haystack = tokens(`${record.subject} ${record.statement}`);
    const matches = queryTokens.filter((token) => haystack.includes(token)).length;
    return matches / queryTokens.length;
};

export class InMemoryInstitutionalMemoryStore implements InstitutionalMemoryStore {
    private readonly records = new Map<string, InstitutionalMemoryRecord>();

    async list(): Promise<readonly InstitutionalMemoryRecord[]> {
        return structuredClone([...this.records.values()]);
    }

    async save(record: InstitutionalMemoryRecord): Promise<void> {
        if (this.records.has(record.id)) {
            throw new Error(`Institutional memory record ${record.id} already exists.`);
        }
        validateRecord(record);
        this.records.set(record.id, structuredClone(record));
    }
}

const validateRecord = (record: InstitutionalMemoryRecord): void => {
    if (!record.id.trim()) throw new Error("Institutional memory id is required.");
    if (!record.subject.trim()) throw new Error("Institutional memory subject is required.");
    if (!record.statement.trim()) throw new Error("Institutional memory statement is required.");
    if (!Number.isFinite(record.confidence) || record.confidence < 0 || record.confidence > 1) {
        throw new Error("Institutional memory confidence must be between 0 and 1.");
    }
    if (record.lastConfirmedAt.getTime() < record.firstObservedAt.getTime()) {
        throw new Error("lastConfirmedAt cannot precede firstObservedAt.");
    }
}

/**
 * Institutional memory is the company's durable knowledge layer.
 *
 * This module deliberately does not infer truth, change objectives, approve
 * work, allocate resources, select agents, or execute anything. It stores
 * evidence-backed knowledge and provides bounded recall to higher executive
 * layers. Executive event memory remains the historical experience source.
 */
export class ExecutiveInstitutionalMemory {
    constructor(private readonly store: InstitutionalMemoryStore) {}

    async remember(candidate: InstitutionalMemoryCandidate): Promise<InstitutionalMemoryRecord> {
        const observedAt = candidate.observedAt ?? new Date();
        const record: InstitutionalMemoryRecord = {
            id: candidate.id,
            kind: candidate.kind,
            subject: candidate.subject.trim(),
            statement: candidate.statement.trim(),
            confidence: candidate.confidence,
            evidenceIds: [...new Set(candidate.evidenceIds ?? [])].sort(),
            objectiveIds: [...new Set(candidate.objectiveIds ?? [])].sort(),
            active: true,
            firstObservedAt: observedAt,
            lastConfirmedAt: observedAt,
        };

        validateRecord(record);
        await this.store.save(record);
        return record;
    }

    async recall(query: InstitutionalMemoryRecallQuery): Promise<InstitutionalMemoryRecallResult> {
        const minConfidence = query.minConfidence ?? 0;
        const limit = query.limit ?? 10;
        if (limit < 1) throw new Error("Recall limit must be at least 1.");

        const allowedKinds = query.kinds ? new Set(query.kinds) : undefined;
        const records = await this.store.list();
        const ranked = records
            .filter((record) => record.active)
            .filter((record) => record.confidence >= minConfidence)
            .filter((record) => !allowedKinds || allowedKinds.has(record.kind))
            .map((record) => ({ record, score: scoreMatch(query.text, record) }))
            .filter((item) => item.score > 0)
            .sort((left, right) =>
                right.score - left.score ||
                right.record.confidence - left.record.confidence ||
                right.record.lastConfirmedAt.getTime() - left.record.lastConfirmedAt.getTime() ||
                left.record.id.localeCompare(right.record.id),
            )
            .slice(0, limit)
            .map((item) => item.record);

        return { records: ranked, matched: ranked.length };
    }
}
