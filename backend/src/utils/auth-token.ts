import jwt from "jsonwebtoken";
import type { AuthUser } from "../types/auth.js";
import { env } from "../config/env.js";

type UserTokenPayload = {
  userId: string;
  name: string;
  email: string;
  role: AuthUser["role"];
  id_casal: string | number | null;
};

export function signAuthToken(payload: UserTokenPayload) {
  return jwt.sign(
    {
      name: payload.name,
      email: payload.email,
      role: payload.role,
      id_casal: payload.id_casal == null ? null : String(payload.id_casal),
    },
    env.jwtSecret,
    {
      subject: payload.userId,
      expiresIn: "30d",
    }
  );
}
