import type { ExecutionOwnership } from "../../orchestration/ownership.js";
import type {
    ExecutiveMemoryRecord,
    ExecutiveMemoryStore,
} from "./executive-memory.js";
import type {
    ExecutiveInstitutionalMemory,
    InstitutionalMemoryCandidate,
} from "./v8-l-institutional-memory.js";

export interface InstitutionalMemoryProjectionResult {
    readonly projected: number;
    readonly skipped: number;
    readonly candidates: readonly InstitutionalMemoryCandidate[];
}

const candidateFromRecord = (record: ExecutiveMemoryRecord): InstitutionalMemoryCandidate | undefined => {
    if (record.lesson?.trim()) {
        return {
            id: `lesson:${record.id}`,
            ownership: record.ownership,
            kind: "LESSON",
            subject: record.action,
            statement: record.lesson.trim(),
            confidence: record.confidence ?? (record.success ? 1 : 0),
            evidenceIds: [record.id],
            objectiveIds: record.objectiveId ? [record.objectiveId] : [],
            observedAt: record.createdAt,
        };
    }

    if (record.eventType === "DECISION_APPROVED" || record.eventType === "DECISION_REJECTED") {
        return {
            id: `decision:${record.id}`,
            ownership: record.ownership,
            kind: "DECISION",
            subject: record.action,
            statement: `${record.eventType === "DECISION_APPROVED" ? "Approved" : "Rejected"}: ${record.outcome}`,
            confidence: record.confidence ?? 1,
            evidenceIds: [record.id],
            objectiveIds: record.objectiveId ? [record.objectiveId] : [],
            observedAt: record.createdAt,
        };
    }

    return undefined;
};

/**
 * Bridges the existing executive experience log into institutional memory.
 *
 * It only projects explicit lessons and decisions. It does not manufacture
 * company facts from raw execution outcomes and it never changes execution,
 * objectives, approvals, budgets, or agent selection.
 */
export class ExecutiveMemoryInstitutionalProjector {
    constructor(
        private readonly executiveMemory: ExecutiveMemoryStore,
        private readonly institutionalMemory: ExecutiveInstitutionalMemory,
    ) {}

    async project(): Promise<InstitutionalMemoryProjectionResult> {
        const records = await this.executiveMemory.list();
        const candidates = records
            .map(candidateFromRecord)
            .filter((candidate): candidate is InstitutionalMemoryCandidate => candidate !== undefined);

        let projected = 0;
        let skipped = records.length - candidates.length;

        for (const candidate of candidates) {
            try {
                await this.institutionalMemory.remember(candidate);
                projected += 1;
            } catch (error) {
                if (error instanceof Error && error.message.includes("already exists")) {
                    skipped += 1;
                    continue;
                }
                throw error;
            }
        }

        return { projected, skipped, candidates };
    }
}
