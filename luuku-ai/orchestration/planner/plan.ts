import { Task } from "../task";

export interface Plan {

    id: string;

    goal: string;

    tasks: Task[];

    metadata: Record<string, unknown>;

    createdAt: Date;

}