import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getRuntimeStatus } from "../controllers/runtime.controller";

export const runtimeRouter = Router();

runtimeRouter.get(\n    "/",\n    requirePermission("admin"),\n    getRuntimeStatus\n);