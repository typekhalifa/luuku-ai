import { WorkflowStatus } from "./workflow-status";
import { WorkflowStep } from "./workflow-step";
import type { ExecutionOwnership } from "../ownership";

export interface Workflow {
    id: string;
    ownership?: ExecutionOwnership;
    goal: string;
    status: WorkflowStatus;
    steps: WorkflowStep[];
    requiresFounderApproval: boolean;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}
