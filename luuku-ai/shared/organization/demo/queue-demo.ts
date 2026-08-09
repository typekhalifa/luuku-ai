import { InMemoryTaskQueue } from "../queue";

import { AgentTask } from "../../agents/interface";

async function run() {

    const queue =

        new InMemoryTaskQueue();

    const task: AgentTask = {

        id: crypto.randomUUID(),

        title: "Research BK",

        description: "Research Bank of Kigali",

        priority: "high"

    };

    await queue.enqueue({

        id: crypto.randomUUID(),

        task,

        status: "queued",

        createdAt: new Date().toISOString()

    });

    console.log("");

    console.log("========================================");

    console.log("      TASK QUEUE DEMO");

    console.log("========================================");

    console.log("");

    console.log(

        "Queue Size:",

        await queue.size()

    );

    console.log("");

    console.log(

        await queue.dequeue()

    );

}

run().catch(console.error);