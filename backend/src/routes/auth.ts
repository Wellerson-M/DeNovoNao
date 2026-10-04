import { Router } from "express";
import {
  checkResetTokenController,
  loginController,
  registerController,
  resetPasswordController,
  updateMeController,
} from "../controllers/auth-controller.js";
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

// Redefinição por link de uso único gerado pelo admin.
// Limite próprio: quem errou a senha várias vezes ainda consegue usar o link.
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Muitas tentativas de redefinição. Espere alguns minutos e tente de novo.",
});

authRouter.get("/reset", resetLimiter, checkResetTokenController);
authRouter.post("/reset", resetLimiter, resetPasswordController);
