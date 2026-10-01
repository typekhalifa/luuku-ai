export type ExecutiveWorkStatus = "ACTIVE" | "WAITING_APPROVAL" | "FAILED" | "COMPLETED";

export interface ExecutiveWorkItem {
    id: string;
    status: ExecutiveWorkStatus;
    owner?: string;
    priority?: string;
}

export interface ExecutiveState {
    generatedAt: Date;
    active: number;
    waitingApproval: number;
    failed: number;
    completed: number;
    attention: readonly string[];
    /** Stable durable identities for currently failed work. */
    readonly failedWorkIds?: readonly string[];
}

export interface ExecutiveStateSource {
    listWork(): readonly ExecutiveWorkItem[];
    listPendingApprovals(): readonly { id: string; action: string }[];
}

export class ExecutiveStateProjector {
    constructor(private readonly source: ExecutiveStateSource) {}

    snapshot(): ExecutiveState {
        const work = this.source.listWork();
        const pendingApprovals = this.source.listPendingApprovals();
        const attention = pendingApprovals.map((approval) => `Approval required: ${approval.action} (${approval.id})`);

        return {
            generatedAt: new Date(),
            active: work.filter((item) => item.status === "ACTIVE").length,
            waitingApproval: work.filter((item) => item.status === "WAITING_APPROVAL").length,
            failed: work.filter((item) => item.status === "FAILED").length,
            completed: work.filter((item) => item.status === "COMPLETED").length,
            attention,
            failedWorkIds: work.filter((item) => item.status === "FAILED").map((item) => item.id),
        };
    }
}
