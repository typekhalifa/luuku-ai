import { Router } from "express";

import { getAgents } from "../controllers/agents.controller";

export const agentsRouter = Router();

agentsRouter.get(

    "/",

    getAgents

);