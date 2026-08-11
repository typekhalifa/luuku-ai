export type ExecutionStatus =
    | "planned"
    | "prepared"
    | "simulated"
    | "queued"
    | "executing"
    | "completed"
    | "failed"
    | "verified";

export interface ExecutionEvidence {

    provider?: string;

    externalId?: string;

    reference?: string;

    details?: Record<string, unknown>;

}

export interface ExecutionResult {

    status: ExecutionStatus;

    executed: boolean;

    verified: boolean;

    evidence?: ExecutionEvidence;

}