import { Router } from "express";
import { requirePermission } from "../../auth/auth.middleware";
import { getObservabilityDashboard, getObservabilityEvents, getObservabilitySummary, getObservabilityTrace } from "../controllers/observability.controller";

export const observabilityRouter = Router();
observabilityRouter.get("/dashboard", requirePermission("read"), getObservabilityDashboard);
observabilityRouter.get("/events", requirePermission("read"), getObservabilityEvents);
observabilityRouter.get("/summary", requirePermission("read"), getObservabilitySummary);
observabilityRouter.get("/executions/:executionId/trace", requirePermission("read"), getObservabilityTrace);
