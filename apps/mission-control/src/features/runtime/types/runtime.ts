export interface RuntimeStatus {

    activeAgent: string | null;

    currentTask: string | null;

    status:
        | "idle"
        | "running";

}