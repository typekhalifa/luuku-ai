import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getCRMOverview } from "../controllers/crm.controller";

export const crmRouter = Router();

crmRouter.get(\n    "/",\n    requirePermission("read"),\n    getCRMOverview\n);