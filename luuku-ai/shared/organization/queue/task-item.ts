import { AgentTask } from "../../agents/interface";

export type TaskStatus =
    | "queued"
    | "running"
    | "completed"
    | "failed";

export interface TaskItem {

    id: string;

    task: AgentTask;

    assignedAgent?: string;

    status: TaskStatus;

    createdAt: string;

    startedAt?: string;

    completedAt?: string;

}