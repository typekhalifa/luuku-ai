export interface Workflow {

    id: string;

    name: string;

    status: "running" | "paused" | "completed";

    steps: number;

    currentStep: number;

}

export class WorkflowApplication {

    async getWorkflows(): Promise<Workflow[]> {

        return [

            {

                id: "workflow-001",

                name: "Prospect Research",

                status: "running",

                steps: 5,

                currentStep: 3,

            },

            {

                id: "workflow-002",

                name: "Lead Qualification",

                status: "completed",

                steps: 7,

                currentStep: 7,

            },

        ];

    }

}

export const workflowApplication =
    new WorkflowApplication();