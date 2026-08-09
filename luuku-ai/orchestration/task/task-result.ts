import { Task } from "./task";

export interface TaskResult {

    task: Task;

    success: boolean;

    output?: unknown;

    error?: Error;

    metadata: Record<string, unknown>;

    completedAt: Date;

}