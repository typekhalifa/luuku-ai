import { api } from "@/sdk/client";

import type { Workflow } from "@/features/workflow";

export class WorkflowClient {

    async getWorkflows(): Promise<Workflow[]> {

        return api.get<Workflow[]>("/workflow");

    }

}

export const workflowClient =
    new WorkflowClient();