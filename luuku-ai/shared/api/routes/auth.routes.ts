import { Router } from "express";

import {
    loginController,
    logoutController,
    meController,
} from "../controllers/auth.controller";

export const authRouter = Router();

authRouter.post("/login", loginController);
authRouter.post("/logout", logoutController);
authRouter.get("/me", meController);
