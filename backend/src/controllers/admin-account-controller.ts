import crypto from "node:crypto";
import type { Request, Response } from "express";
import mongoose from "mongoose";
// @ts-ignore
import { User } from "../models/User.js";
// @ts-ignore
import { AuditLog } from "../models/AuditLog.js";
import { getReviewDriver } from "../data/review-store.js";
import { recordAudit } from "../utils/audit.js";
import { escapeRegex } from "../utils/escape-regex.js";

const RESET_TTL_HOURS = 24;
const EXPORT_LIMIT = 5000;

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "A área administrativa exige conexão com o MongoDB" });
    return false;
  }

  return true;
}

function getRouteId(value: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

async function findUserOr404(request: Request, response: Response) {
  const id = getRouteId(request.params.id);

  if (!mongoose.Types.ObjectId.isValid(id)) {
    response.status(400).json({ message: "ID de usuário inválido." });
    return null;
  }

  const user = await User.findById(id);

  if (!user) {
    response.status(404).json({ message: "Usuário não encontrado." });
    return null;
  }

  return user;
}

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

/**
 * Encerra todas as sessões do usuário: tokens emitidos antes de agora param
 * de valer. Útil quando o celular é perdido ou a conta foi acessada por alguém.
 */
export async function revokeSessionsController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const user = await findUserOr404(request, response);
    if (!user) {
      return;
    }

    // +1s para garantir que o token emitido neste mesmo segundo também caia.
    user.tokensValidFrom = new Date(Date.now() + 1000);
    await user.save();

    await recordAudit(request, {
      action: "user.sessions_revoked",
      targetType: "user",
      targetId: String(user._id),
      targetLabel: user.login ?? user.name ?? "",
    });

    return response.status(200).json({ message: "Sessões encerradas." });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

/**
 * Gera um link de uso único para a pessoa criar uma senha nova.
 * O admin copia e manda pelo WhatsApp — o app não envia e-mail.
 */
export async function createResetLinkController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const user = await findUserOr404(request, response);
    if (!user) {
      return;
    }

    if (user.active === false) {
      return response.status(400).json({ message: "Reative a conta antes de gerar um link." });
    }

    const token = crypto.randomBytes(32).toString("hex");
    user.resetTokenHash = hashResetToken(token);
    user.resetExpiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000);
    await user.save();

    await recordAudit(request, {
      action: "user.reset_link",
      targetType: "user",
      targetId: String(user._id),
      targetLabel: user.login ?? user.name ?? "",
      details: { expiresInHours: RESET_TTL_HOURS },
    });

    return response.status(200).json({
      token,
      login: user.login ?? "",
      name: user.name ?? "",
      expiresAt: user.resetExpiresAt,
      expiresInHours: RESET_TTL_HOURS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

function csvCell(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

/** Baixa as ocorrências em CSV, para guardar antes de limpar. */
export async function exportLogsController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const action = typeof request.query.action === "string" ? request.query.action.trim() : "";
    const filter: Record<string, unknown> = {};

    if (action && action !== "all") {
      filter.action = action.includes(".") ? action : { $regex: `^${escapeRegex(action)}\\.`, $options: "i" };
    }

    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ actorName: regex }, { actorLogin: regex }, { targetLabel: regex }, { action: regex }];
    }

    const logs = await AuditLog.find(filter).sort({ createdAt: -1 }).limit(EXPORT_LIMIT).lean();

    const header = ["data", "acao", "quem", "login", "nivel", "alvo", "ip", "detalhes"];
    const lines = [header.join(",")];

    for (const log of logs as Array<Record<string, unknown>>) {
      lines.push(
        [
          csvCell(new Date(String(log.createdAt)).toISOString()),
          csvCell(log.action),
          csvCell(log.actorName),
          csvCell(log.actorLogin),
          csvCell(log.actorRole),
          csvCell(log.targetLabel),
          csvCell(log.ip),
          csvCell(JSON.stringify(log.details ?? {})),
        ].join(",")
      );
    }

    const stamp = new Date().toISOString().slice(0, 10);
    response.setHeader("Content-Type", "text/csv; charset=utf-8");
    response.setHeader("Content-Disposition", `attachment; filename="ocorrencias-${stamp}.csv"`);
    // BOM para o Excel abrir os acentos corretamente.
    return response.status(200).send(`﻿${lines.join("\n")}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}
