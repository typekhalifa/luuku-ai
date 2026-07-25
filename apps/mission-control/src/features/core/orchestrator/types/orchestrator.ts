export interface OrchestratorState {

    goal: string | null;

    stage:
        | "idle"
        | "planning"
        | "executing"
        | "completed";

}