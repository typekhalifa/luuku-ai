import { Router } from "express";
import { requirePermission } from "../../auth/auth.middleware";
import { getObservabilityEvents, getObservabilitySummary, getObservabilityTrace } from "../controllers/observability.controller";

export const observabilityRouter = Router();
observabilityRouter.get("/events", requirePermission("read"), getObservabilityEvents);
observabilityRouter.get("/summary", requirePermission("read"), getObservabilitySummary);
observabilityRouter.get("/executions/:executionId/trace", requirePermission("read"), getObservabilityTrace);
