import { Router } from "express";
import { healthzController, readyzController } from "../controllers/health.controller";

export const healthRouter = Router();

healthRouter.get("/healthz", healthzController);
healthRouter.get("/readyz", readyzController);
