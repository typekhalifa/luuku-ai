import { Request, Response } from "express";

import { workflowApplication } from "../../application/workflow.application";

export async function getWorkflows(

    _request: Request,

    response: Response

): Promise<void> {

    const workflows =
        await workflowApplication.getWorkflows();

    response.json(workflows);

}