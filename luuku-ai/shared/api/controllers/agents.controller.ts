import { Request, Response } from "express";

import { agentApplication } from "../../application/agent.application";

export async function getAgents(

    _request: Request,

    response: Response

): Promise<void> {

    const agents =
        await agentApplication.getAgents();

    response.json(agents);

}