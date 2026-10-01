import { Router } from "express";
import { requirePermission } from "../../auth/auth.middleware";
import { getObservabilityAlerts } from "../controllers/observability-alerts.controller";

export const observabilityAlertsRouter = Router();
observabilityAlertsRouter.get("/", requirePermission("read"), getObservabilityAlerts);
