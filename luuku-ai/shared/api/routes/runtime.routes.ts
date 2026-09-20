import { Router } from "express";
import { requireServiceRole } from "../auth/auth.middleware";

import { getRuntimeStatus } from "../controllers/runtime.controller";

export const runtimeRouter = Router();

runtimeRouter.get("/", requireServiceRole, getRuntimeStatus);