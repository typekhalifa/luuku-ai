import {

    AgentTask

} from "./interface";

import {

    getAgent

} from "./registry";

export async function runAgent(

    agentId: string,

    task: AgentTask

) {

    const agent = getAgent(agentId);

    if (!agent) {

        throw new Error(

            `Agent "${agentId}" not found.`

        );

    }

    return await agent.execute(task);

}