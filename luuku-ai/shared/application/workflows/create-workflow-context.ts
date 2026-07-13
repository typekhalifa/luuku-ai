import crypto from "crypto";

import { WorkflowContext } from "./workflow-context";

export function createWorkflowContext():

WorkflowContext {

    return {

        workflowId:

            crypto.randomUUID(),

        startedAt:

            new Date()

    };

}