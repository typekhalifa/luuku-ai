import { ApprovalStore, ApprovalStatus } from "./approval-store.js";

export type ExecutionEligibility = "READY" | "WAITING_FOR_APPROVAL" | "REJECTED";

export interface ExecutionContinuation {
    approvalId: string;
    status: ApprovalStatus;
    eligibility: ExecutionEligibility;
}

export class ApprovalExecutionGate {
    constructor(private readonly store: ApprovalStore) {}

    evaluate(approvalId: string): ExecutionContinuation {
        const record = this.store.get(approvalId);
        if (!record) throw new Error(`Unknown approval request: ${approvalId}`);
        if (record.status === "PENDING") {
            return { approvalId, status: record.status, eligibility: "WAITING_FOR_APPROVAL" };
        }
        if (record.status === "APPROVED") {
            return { approvalId, status: record.status, eligibility: "READY" };
        }
        return { approvalId, status: record.status, eligibility: "REJECTED" };
    }
}
