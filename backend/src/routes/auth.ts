import { Router } from "express";
import { loginController, registerController, updateMeController } from "../controllers/auth-controller.js";
import { optionalAuth, requireAuth } from "../middlewares/auth.js";
import { rateLimit } from "../middlewares/rate-limit.js";

export const authRouter = Router();

// Trava tentativa de adivinhar senha e criação de contas em massa.
const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 15,
  message: "Muitas tentativas de login. Espere alguns minutos e tente de novo.",
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Muitas contas criadas deste dispositivo. Tente mais tarde.",
});

authRouter.post("/register", registerLimiter, registerController);
authRouter.post("/login", loginLimiter, loginController);
authRouter.put("/me", optionalAuth, requireAuth, updateMeController);
