import {
    Agent,
    AgentTask,
    AgentResult
} from "./interface";

export abstract class BaseAgent
    implements Agent {

    abstract id: string;

    abstract name: string;

    abstract role: string;

    abstract execute(
        task: AgentTask
    ): Promise<AgentResult>;

}