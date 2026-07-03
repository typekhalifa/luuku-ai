export interface AgentTask {

    id: string;

    title: string;

    description: string;

    priority:
        | "low"
        | "medium"
        | "high";

}

export interface AgentResult {

    success: boolean;

    summary: string;

    completedAt: string;

}

export interface Agent {

    id: string;

    name: string;

    role: string;

    execute(
        task: AgentTask
    ): Promise<AgentResult>;

}