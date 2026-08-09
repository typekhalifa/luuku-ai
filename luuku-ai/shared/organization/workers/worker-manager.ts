import { Worker } from "./worker";

import {
    AgentTask,
    AgentResult
} from "../../agents/interface";

export interface WorkerManager {

    register(
        worker: Worker
    ): void;

    execute(
        agent: string,
        task: AgentTask
    ): Promise<AgentResult>;

    workers(): Worker[];

}