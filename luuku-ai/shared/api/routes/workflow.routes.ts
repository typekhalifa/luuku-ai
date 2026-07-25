import { Router } from "express";

import { getWorkflows } from "../controllers/workflow.controller";

export const workflowRouter = Router();

workflowRouter.get("/", getWorkflows);