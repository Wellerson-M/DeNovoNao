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
  max: 6,
  message: "Muitas tentativas de login. Espere alguns minutos e tente de novo.",
});

// Protege uma conta específica mesmo quando as tentativas vêm de vários IPs.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  message: "Esta conta recebeu tentativas demais. Espere alguns minutos e tente de novo.",
  keyBy(request) {
    const login = (request.body as { login?: unknown })?.login;
    return typeof login === "string" && login.trim() ? `conta:${login.trim().toLowerCase()}` : null;
  },
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: "Muitas contas criadas deste dispositivo. Tente mais tarde.",
});

authRouter.post("/register", registerLimiter, registerController);
authRouter.post("/login", loginLimiter, accountLimiter, loginController);
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
