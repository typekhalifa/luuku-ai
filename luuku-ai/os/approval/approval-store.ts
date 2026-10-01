import { ApprovalRequest } from "./approval-gateway.js";

export type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface ApprovalRecord extends ApprovalRequest {
    status: ApprovalStatus;
    decidedAt?: Date;
    decidedBy?: string;
}

export class ApprovalStore {
    private readonly records = new Map<string, ApprovalRecord>();

    create(request: ApprovalRequest): ApprovalRecord {
        if (this.records.has(request.id)) throw new Error(`Approval already exists: ${request.id}`);
        const record: ApprovalRecord = { ...request, status: "PENDING" };
        this.records.set(record.id, record);
        return record;
    }

    get(id: string): ApprovalRecord | undefined {
        return this.records.get(id);
    }

    decide(id: string, decision: "APPROVED" | "REJECTED", decidedBy: string): ApprovalRecord {
        const record = this.records.get(id);
        if (!record) throw new Error(`Unknown approval request: ${id}`);
        if (record.status !== "PENDING") throw new Error(`Approval is already decided: ${id}`);
        if (!decidedBy.trim()) throw new Error("Approval decision requires a decision maker.");
        const updated: ApprovalRecord = { ...record, status: decision, decidedAt: new Date(), decidedBy: decidedBy.trim() };
        this.records.set(id, updated);
        return updated;
    }

    listPending(): readonly ApprovalRecord[] {
        return [...this.records.values()].filter((record) => record.status === "PENDING");
    }
}
