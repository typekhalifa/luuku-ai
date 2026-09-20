import { Request, Response } from "express";

import { crmApplication } from "../../application/crm.application";
import { getApiRequestContext } from "../request-context";

export async function getCRMOverview(
    _request: Request,
    response: Response
): Promise<void> {
    const context = getApiRequestContext(response.locals);
    const overview = await crmApplication.getOverview(context);

    response.json(overview);
}
