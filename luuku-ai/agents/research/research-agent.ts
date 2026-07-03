import { BaseAgent } from "../../shared/agents/base";

import {

    AgentTask,

    AgentResult

} from "../../shared/agents/interface";

import {

    executeResearchTask

} from "./execute";

export class ResearchAgent extends BaseAgent {

    id = "research";

    name = "Research Agent";

    role = "Research";

    async execute(

        task: AgentTask

    ): Promise<AgentResult> {

        return executeResearchTask(task);

    }

}