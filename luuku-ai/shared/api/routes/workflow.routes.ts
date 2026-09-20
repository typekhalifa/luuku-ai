import { Router } from "express";
import { requireServiceRole } from "../auth/auth.middleware";

import { getWorkflows } from "../controllers/workflow.controller";

export const workflowRouter = Router();

workflowRouter.get("/", requireServiceRole, getWorkflows);