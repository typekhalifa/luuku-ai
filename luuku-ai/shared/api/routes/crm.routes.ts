import { Router } from "express";

import { getCRMOverview } from "../controllers/crm.controller";

export const crmRouter = Router();

crmRouter.get("/", getCRMOverview);