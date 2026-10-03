import { Request, Response } from "express";

import { runtimeApplication } from "../../application/runtime.application";
import { getApiRequestContext } from "../request-context";

export async function getRuntimeStatus(
    _request: Request,
    response: Response,
): Promise<void> {
    const context = getApiRequestContext(response.locals);
    const runtime = await runtimeApplication.getStatus(context.companyId);

    response.json(runtime);
}
