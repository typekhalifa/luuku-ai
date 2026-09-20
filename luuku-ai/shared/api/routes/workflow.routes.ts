import { Router } from "express";
import { requirePermission } from "../auth/auth.middleware";

import { getWorkflows } from "../controllers/workflow.controller";

export const workflowRouter = Router();

workflowRouter.get(
    "/",
    requirePermission("read"),
    getWorkflows
);
