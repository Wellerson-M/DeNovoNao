import jwt from "jsonwebtoken";
import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env.js";
import type { AuthRole, AuthUser } from "../types/auth.js";

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
  id_casal?: string | null;
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
    id_casal: typeof payload.id_casal === "string" && payload.id_casal.trim() ? payload.id_casal.trim() : null,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}

export function optionalAuth(request: Request, _response: Response, next: NextFunction) {
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
    const authUser = normalizeAuthUser(payload);

    if (!authUser.id) {
      return next(new Error("Invalid token payload"));
    }

    request.authUser = authUser;
    return next();
  } catch (error) {
    return _response.status(401).json({
      message: error instanceof Error ? error.message : "Invalid token",
    });
  }
}

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  if (!request.authUser || !request.authUser.id) {
    return response.status(401).json({ message: "Authentication required" });
  }

  return next();
}

export function requireRoleAtLeast(minimumRole: AuthRole) {
  return (request: Request, response: Response, next: NextFunction) => {
    const role = request.authUser?.role ?? 0;

    if (role < minimumRole) {
      return response.status(403).json({ message: "Insufficient permissions" });
    }

    return next();
  };
}
