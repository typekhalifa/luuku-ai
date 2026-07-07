import { BaseAgent } from "../../../shared/agents/base";

import {

    AgentTask,

    AgentResult

} from "../../../shared/agents/interface";

import {

    executeSalesTask

} from "./execute";

import { executeSalesWorkflow } from "./workflow";

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

        await executeSalesWorkflow(task);

        return {

            success: true,

            summary:

                `Sales workflow completed "${task.title}".`,

            completedAt:

                new Date().toISOString()

        };

    }

}