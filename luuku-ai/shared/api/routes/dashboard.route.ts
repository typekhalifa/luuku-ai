import { Router } from "express";

import { getDashboard } from "../controllers/dashboard.controller";

export const dashboardRouter = Router();

dashboardRouter.get(

    "/",

    getDashboard

);