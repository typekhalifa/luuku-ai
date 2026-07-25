export interface Workflow {
    id: string;
    name: string;
    status: "running" | "paused" | "completed";
    steps: number;
    currentStep: number;
}