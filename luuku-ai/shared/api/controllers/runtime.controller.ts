import { Request, Response } from "express";

import { runtimeApplication } from "../../application/runtime.application";

export async function getRuntimeStatus(

    _request: Request,

    response: Response

): Promise<void> {

    const runtime =
        await runtimeApplication.getStatus();

    response.json(runtime);

}