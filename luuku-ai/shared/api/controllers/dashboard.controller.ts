import { Request, Response } from "express";

import { dashboardApplication } from "../../application";
import { getApiRequestContext } from "../request-context";

export async function getDashboard(
    _request: Request,
    response: Response
) {
    const context = getApiRequestContext(response.locals);
    const overview = await dashboardApplication.getOverview(context);

    response.json(overview);
}
