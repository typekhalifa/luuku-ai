import { Request, Response } from "express";

import { eventApplication } from "../../application/event.application";
import { getApiRequestContext } from "../request-context";

export async function getEvents(
    _request: Request,
    response: Response,
): Promise<void> {
    const context = getApiRequestContext(response.locals);
    const events = await eventApplication.getEvents(context.companyId);

    response.json(events);
}
