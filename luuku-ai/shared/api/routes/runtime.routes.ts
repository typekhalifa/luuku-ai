import { Router } from "express";

import { getRuntimeStatus } from "../controllers/runtime.controller";

export const runtimeRouter = Router();

runtimeRouter.get("/", getRuntimeStatus);