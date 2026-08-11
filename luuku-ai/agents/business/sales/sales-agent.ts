import { BaseAgent } from "../../../shared/agents/base";

import {
    AgentTask,
    AgentResult
} from "../../../shared/agents/interface";

import {
    executeSalesWorkflow
} from "./workflow";

export class SalesAgent extends BaseAgent {

    id = "sales";

    name = "Sales Agent";

    role = "Sales";

    async execute(

        task: AgentTask

    ): Promise<AgentResult> {

        console.log("");

        console.log("========================================");

        console.log("         SALES AGENT");

        console.log("========================================");

        console.log("");

        return executeSalesWorkflow(
            task
        );

    }

}