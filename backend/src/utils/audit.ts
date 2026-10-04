import type { Request } from "express";
// @ts-ignore
import { AuditLog } from "../models/AuditLog.js";
import { getReviewDriver } from "../data/review-store.js";
import { clientIp } from "./client-ip.js";

export type AuditAction =
  | "review.create"
  | "review.update"
  | "review.trash"
  | "review.restore"
  | "review.delete"
  | "trash.purge"
  | "logs.purge"
  | "user.register"
  | "user.update"
  | "user.delete"
  | "user.profile_update"
  | "user.password_change"
  | "auth.login"
  | "auth.login_failed";

type AuditInput = {
  action: AuditAction;
  targetType?: "review" | "user" | "system";
  targetId?: string | null;
  targetLabel?: string;
  details?: Record<string, unknown>;
  /** Quando quem agiu não está autenticado (ex.: login falhado). */
  actor?: { id?: string | null; name?: string; login?: string; role?: number };
};

/**
 * Grava uma ocorrência. Nunca lança: uma falha de auditoria não pode
 * derrubar a ação que o usuário pediu.
 */
export async function recordAudit(request: Request, input: AuditInput) {
  if (getReviewDriver() !== "mongo") {
    return;
  }

  const actor = input.actor ?? request.authUser;

  try {
    await AuditLog.create({
      action: input.action,
      actorId: actor?.id ? String(actor.id) : null,
      actorName: actor?.name ?? "",
      actorLogin: actor?.login ?? "",
      actorRole: typeof actor?.role === "number" ? actor.role : 0,
      targetType: input.targetType ?? "system",
      targetId: input.targetId ? String(input.targetId) : null,
      targetLabel: input.targetLabel ?? "",
      details: input.details ?? {},
      ip: clientIp(request),
    });
  } catch (error) {
    console.warn("Não foi possível registrar a ocorrência", error);
  }
}
