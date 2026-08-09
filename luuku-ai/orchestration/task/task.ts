import { Priority } from "./priority";
import { TaskStatus } from "./task-status";
import { TaskType } from "./task-type";

export interface Task {

    id: string;

    title: string;

    description: string;

    type: TaskType;

    priority: Priority;

    status: TaskStatus;

    input: unknown;

    output?: unknown;

    metadata: Record<string, unknown>;

    createdAt: Date;

    updatedAt: Date;

}