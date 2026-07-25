import { Request, Response } from "express";

import { crmApplication } from "../../application/crm.application";

export async function getCRMOverview(

    _request: Request,

    response: Response

): Promise<void> {

    const overview =
        await crmApplication.getOverview();

    response.json(overview);

}