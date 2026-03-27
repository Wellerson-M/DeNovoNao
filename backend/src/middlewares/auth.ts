import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import type { AuthRole, AuthUser } from "../types/auth.js";
// @ts-ignore
import { User } from "../models/User.js";

declare module "express-serve-static-core" {
  interface Request {
    authUser?: AuthUser;
  }
}

type JwtPayload = {
  sub?: string;
  id?: string;
  email?: string;
  role?: number;
  id_casal?: string | number | null;
};

type CurrentUserRecord = {
  _id: unknown;
  role?: number;
  id_casal?: string | number | null;
  email?: string;
};

function extractBearerToken(request: Request) {
  const authorization = request.headers.authorization;

  if (!authorization) {
    return null;
  }

  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    return null;
  }

  return token;
}

function normalizeAuthUser(payload: JwtPayload): AuthUser {
  const role = Number(payload.role);
  const authRole: AuthRole = role === 2 ? 2 : role === 1 ? 1 : 0;

  return {
    id: String(payload.sub ?? payload.id ?? ""),
    role: authRole,
    id_casal:
      payload.id_casal == null ? null : String(payload.id_casal).trim() ? String(payload.id_casal).trim() : null,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

export async function optionalAuth(request: Request, _response: Response, next: NextFunction) {
  const token = extractBearerToken(request);

  if (!token) {
    request.authUser = {
      id: "",
      role: 0,
      id_casal: null,
    };
    return next();
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;
    let authUser = normalizeAuthUser(payload);

    if (!authUser.id) {
      return next(new Error("Token inválido"));
    }

    try {
      const currentUser = (await User.findById(authUser.id).lean()) as CurrentUserRecord | null;

      if (currentUser) {
        authUser = {
          id: String(currentUser._id),
          role: currentUser.role === 2 ? 2 : currentUser.role === 1 ? 1 : 0,
          id_casal:
            currentUser.id_casal == null ? null : String(currentUser.id_casal).trim() || null,
          email: typeof currentUser.email === "string" ? currentUser.email : authUser.email,
        };
      }
    } catch {
      // If the database lookup fails, keep the token payload as a fallback.
    }

    request.authUser = authUser;
    return next();
  } catch (error) {
    return _response.status(401).json({
      message: error instanceof Error ? error.message : "Token inválido",
    });
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  if (!request.authUser || !request.authUser.id) {
    return response.status(401).json({ message: "Autenticação obrigatória" });
  }

  return next();
}

export function requireRoleAtLeast(minimumRole: AuthRole) {
  return (request: Request, response: Response, next: NextFunction) => {
    const role = request.authUser?.role ?? 0;

    if (role < minimumRole) {
      return response.status(403).json({ message: "Permissão insuficiente" });
    }

    return next();
  };
}
