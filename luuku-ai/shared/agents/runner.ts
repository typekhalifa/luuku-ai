import {

    AgentTask,
    AgentResult

} from "./interface";

import {

    getAgent

} from "./registry";

const inFlightTasks = new Set<string>();

export async function runAgent(

    agentId: string,

    task: AgentTask

): Promise<AgentResult> {

    const agent = getAgent(agentId);

    if (!agent) {

        throw new Error(

            `Agent "${agentId}" not found.`

        );

    }

    if (inFlightTasks.has(task.id)) {

        return {
            success: false,
            summary: "This agent task is already executing. No second execution was dispatched.",
            completedAt: new Date().toISOString(),
            executionStatus: "blocked",
            executed: false,
            verified: false,
            blockers: [
                `Duplicate concurrent execution prevented for task ${task.id}.`
            ]
        };

    }

    inFlightTasks.add(task.id);

    try {

        return await agent.execute(task);

    } finally {

        inFlightTasks.delete(task.id);

    }

}