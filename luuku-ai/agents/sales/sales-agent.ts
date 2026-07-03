import { BaseAgent } from "../../shared/agents/base";

import {

    AgentTask,

    AgentResult

} from "../../shared/agents/interface";

import {

    executeSalesTask

} from "./execute";

export class SalesAgent extends BaseAgent {

    id = "sales";

    name = "Sales Agent";

    role = "Sales";

    async execute(

        task: AgentTask

    ): Promise<AgentResult> {

        return executeSalesTask(task);

    }

}