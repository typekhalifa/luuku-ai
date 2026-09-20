import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getEvents } from "../controllers/events.controller";

export const eventsRouter = Router();

eventsRouter.get(\n    "/",\n    requirePermission("read"),\n    getEvents\n);