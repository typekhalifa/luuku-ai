export interface RuntimeAgent {

    id: string;

    name: string;

    status:
        | "online"
        | "offline"
        | "busy";

    skills: string[];

    currentTask?: string;

    heartbeat: string;

}