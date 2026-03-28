import { Router } from "express";
import { loginController, registerController, updateMeController } from "../controllers/auth-controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";

export const authRouter = Router();

authRouter.post("/register", registerController);
authRouter.post("/login", loginController);
authRouter.put("/me", optionalAuth, requireAuth, updateMeController);
