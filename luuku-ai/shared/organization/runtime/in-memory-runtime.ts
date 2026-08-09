import {

    AgentTask,

    AgentResult

} from "../../agents/interface";

import {

    TaskItem,

    TaskQueue

} from "../queue";

import {

    WorkerManager

} from "../workers";

import {

    OrganizationRuntime

} from "./runtime";

export class InMemoryOrganizationRuntime

    implements OrganizationRuntime {

    constructor(

        private readonly queue: TaskQueue,

        private readonly workers: WorkerManager

    ) {}

    async submit(

        agent: string,

        task: AgentTask

    ): Promise<AgentResult> {

        const item: TaskItem = {

            id: crypto.randomUUID(),

            task,

            assignedAgent: agent,

            status: "queued",

            createdAt:

                new Date().toISOString()

        };

        await this.queue.enqueue(item);

        const queued =

            await this.queue.dequeue();

        if (!queued) {

            throw new Error(

                "Queue returned no task."

            );

        }

        const result =

            await this.workers.execute(

                agent,

                queued.task

            );

        return result;

    }

}