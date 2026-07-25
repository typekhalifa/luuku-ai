import { Request, Response } from "express";

import { eventApplication } from "../../application/event.application";

export async function getEvents(

    _request: Request,

    response: Response

): Promise<void> {

    const events =
        await eventApplication.getEvents();

    response.json(events);

}