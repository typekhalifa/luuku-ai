export interface RuntimeStatus {
    activeAgent: string | null;
    currentTask: string | null;
    status: "idle" | "running";
}

export class RuntimeApplication {

    async getStatus(): Promise<RuntimeStatus> {

        return {

            activeAgent: "Research Agent",

            currentTask: "Researching BK Group",

            status: "running",

        };

    }

}

export const runtimeApplication =
    new RuntimeApplication();