import { WorkflowStatus } from "./workflow-status";
import { WorkflowStep } from "./workflow-step";

export interface Workflow {
    id: string;
    goal: string;
    status: WorkflowStatus;
    steps: WorkflowStep[];
    requiresFounderApproval: boolean;
    approvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
}
