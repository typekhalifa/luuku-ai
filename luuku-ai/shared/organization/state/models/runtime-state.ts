export type RuntimeStatus =
    | "starting"
    | "running"
    | "paused"
    | "stopping"
    | "stopped";

export interface RuntimeState {

    status: RuntimeStatus;

    uptimeSeconds: number;

}