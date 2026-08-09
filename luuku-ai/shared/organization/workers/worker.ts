
import {

    AgentTask,

    AgentResult

} from "../../agents/interface";

import { WorkerState } from "./worker-state";

export interface Worker {

    id: string;

    agent: string;

    state: WorkerState;

    execute(

        task: AgentTask

    ): Promise<AgentResult>;
}