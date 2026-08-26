import { Priority } from "../task/priority";

export type WorkflowStepStatus =
    | "PENDING"
    | "BLOCKED"
    | "READY"
    | "RUNNING"
    | "COMPLETED"
    | "FAILED"
    | "CANCELLED";

export interface WorkflowStep {
    id: string;
    title: string;
    description: string;
    agentId: string;
    capability?: string;
    dependsOn: string[];
    priority: Priority;
    requiresApproval: boolean;
    status: WorkflowStepStatus;
    input?: unknown;
    output?: unknown;
    error?: string;
}
