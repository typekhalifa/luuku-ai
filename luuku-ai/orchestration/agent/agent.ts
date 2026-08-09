import { Task, TaskResult } from "../task";
import { Capability } from "./capability";

export interface Agent {

    id: string;

    name: string;

    description: string;

    capabilities: Capability[];

    execute(task: Task): Promise<TaskResult>;

}