export interface RuntimeState {

    activeAgent: string | null;

    currentTask: string | null;

    status:
        | "idle"
        | "running";

}