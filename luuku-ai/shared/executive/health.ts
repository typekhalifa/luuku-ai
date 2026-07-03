import { registry } from "../../agents/executive-ai/registry";
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

export function buildAgentHealth() {

    const tasks = getTasks();

    return registry.map(agent => {

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