import { Worker } from "./worker";

import { WorkerManager } from "./worker-manager";

import {
    AgentTask,
    AgentResult
} from "../../agents/interface";



export class InMemoryWorkerManager

    implements WorkerManager {

    private readonly registry =

        new Map<string, Worker>();

    register(

        worker: Worker

    ): void {

        this.registry.set(

            worker.agent,

            worker

        );

    }

    async execute(

        agent: string,

        task: AgentTask

    ): Promise<AgentResult> {

        const worker =

            this.registry.get(agent);

        if (!worker) {

            throw new Error(

                `Worker not found: ${agent}`

            );

        }

        worker.state = "busy";

        const result =

            await worker.execute(task);

        worker.state = "idle";

        return result;

    }

    workers(): Worker[] {

        return [

            ...this.registry.values()

        ];

    }

}