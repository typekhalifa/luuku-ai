export type AgentStatus =
    | "running"
    | "idle"
    | "offline";

export interface Agent {

    id: string;

    name: string;

    status: AgentStatus;

    task: string;

}