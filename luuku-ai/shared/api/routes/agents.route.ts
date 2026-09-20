import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getAgents } from "../controllers/agents.controller";

export const agentsRouter = Router();

agentsRouter.get(

    "/",

    getAgents

);