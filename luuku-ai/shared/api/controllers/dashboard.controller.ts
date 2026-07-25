import { Request, Response } from "express";

import { dashboardApplication } from "../../application";

export async function getDashboard(
    _request: Request,
    response: Response
) {
    const overview =
        await dashboardApplication.getOverview();

    response.json(overview);
}