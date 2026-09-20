import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getDashboard } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get(

    "/",

    getDashboard

);