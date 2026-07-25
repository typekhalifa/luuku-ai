import { Router } from "express";

import { getEvents } from "../controllers/events.controller";

export const eventsRouter = Router();

eventsRouter.get(

    "/",

    getEvents

);