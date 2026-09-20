import { Router } from "express";
import { requireServiceRole } from "../auth/auth.middleware";

import { getEvents } from "../controllers/events.controller";

export const eventsRouter = Router();

eventsRouter.get("/", requireServiceRole, getEvents);