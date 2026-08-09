import { AgentTask, AgentResult } from "../../agents/interface";

export interface OrganizationRuntime {

    submit(

        agent: string,

        task: AgentTask

    ): Promise<AgentResult>;

}