import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getCRMOverview } from "../controllers/crm.controller";

export const crmRouter = Router();

crmRouter.get("/", getCRMOverview);