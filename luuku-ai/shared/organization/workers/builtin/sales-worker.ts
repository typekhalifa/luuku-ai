import { Worker } from "../worker";

import {
    AgentTask,
    AgentResult
} from "../../../agents/interface";

export class SalesWorker implements Worker {

    id = crypto.randomUUID();

    agent = "sales";

    state = "idle" as const;

    async execute(
        task: AgentTask
    ): Promise<AgentResult> {

        console.log("");

        console.log("========================================");

        console.log("      SALES WORKER");

        console.log("========================================");

        console.log("");

        console.log("Executing task:");

        console.log(task);

        return {

            success: true,

            summary: "Sales worker executed task.",

            completedAt: new Date().toISOString()

        };

    }

}