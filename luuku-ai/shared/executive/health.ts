import { getAgents } from "../agents/registry";
import { getTasks } from "../services/task";

export interface AgentHealth {

    id: string;

    name: string;

    role: string;

    status:
        | "idle"
        | "busy"
        | "offline";

    activeTasks: number;

}

export function buildAgentHealth(): AgentHealth[] {

    const agents = getAgents();

    const tasks = getTasks();

    return agents.map(agent => {

        const activeTasks = tasks.filter(task =>

            task.assignedAgent === agent.name &&

            (

                task.status === "assigned" ||

                task.status === "in-progress"

            )

        ).length;

        return {

            id: agent.id,

            name: agent.name,

            role: agent.role,

            status:

                activeTasks > 0

                    ? "busy"

                    : "idle",

            activeTasks

        };

    });

}