import { Router } from "express";

import { requireServiceRole } from "../../auth/auth.middleware";
import { getMetrics, getMetricsSnapshot } from "../controllers/metrics.controller";

export const metricsRouter = Router();

metricsRouter.get("/", requireServiceRole, getMetrics);
metricsRouter.get("/snapshot", requireServiceRole, getMetricsSnapshot);
