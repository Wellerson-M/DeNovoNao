import type { AuthRole, AuthSession } from "@/lib/types";

type JwtPayload = {
  sub?: string;
  id?: string;
  email?: string;
  role?: number;
  id_casal?: string | number | null;
};

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  return atob(padded);
}

export function decodeTokenToSession(token: string): AuthSession {
  const parts = token.split(".");

  if (parts.length !== 3) {
    throw new Error("JWT inválido");
  }

  const payload = JSON.parse(decodeBase64Url(parts[1])) as JwtPayload;
  const roleNumber = Number(payload.role);
  const role: AuthRole = roleNumber === 2 ? 2 : roleNumber === 1 ? 1 : 0;
  const userId = String(payload.sub ?? payload.id ?? "").trim();

  if (!userId) {
    throw new Error("JWT sem identificador de usuário");
  }

  return {
    token,
    userId,
    role,
    id_casal: payload.id_casal == null ? null : String(payload.id_casal).trim() || null,
    email: typeof payload.email === "string" ? payload.email : undefined,
  };
}
