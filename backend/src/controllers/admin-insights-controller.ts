import type { Request, Response } from "express";
import mongoose from "mongoose";
// @ts-ignore
import { Review } from "../models/Review.js";
// @ts-ignore
import { User } from "../models/User.js";
// @ts-ignore
import { AuditLog } from "../models/AuditLog.js";
import { getReviewDriver } from "../data/review-store.js";
import { escapeRegex } from "../utils/escape-regex.js";
import { recordAudit } from "../utils/audit.js";

const PAGE_SIZE = 20;

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "A área administrativa exige conexão com o MongoDB" });
    return false;
  }

  return true;
}

function parsePage(value: unknown) {
  return Math.max(Number(value ?? 1) || 1, 1);
}

/** Aceita só datas reais e recusa o resto, para a limpeza nunca rodar sem recorte. */
function parseDateInput(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Números do topo do painel: o que precisa de atenção agora. */
export async function adminOverviewController(_request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const last7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalReviews, activeReviews, trashedReviews, privateReviews, totalUsers, admins, usersWithoutCouple, newReviews, failedLogins] =
      await Promise.all([
        Review.countDocuments({}),
        Review.countDocuments({ active: true }),
        Review.countDocuments({ active: false }),
        Review.countDocuments({ active: true, isPublic: false }),
        User.countDocuments({}),
        User.countDocuments({ role: 2 }),
        User.countDocuments({ $or: [{ id_casal: null }, { id_casal: "" }] }),
        Review.countDocuments({ createdAt: { $gte: last7Days } }),
        AuditLog.countDocuments({ action: "auth.login_failed", createdAt: { $gte: last7Days } }),
      ]);

    return response.status(200).json({
      reviews: { total: totalReviews, active: activeReviews, trashed: trashedReviews, private: privateReviews, last7Days: newReviews },
      users: { total: totalUsers, admins, withoutCouple: usersWithoutCouple },
      security: { failedLogins7Days: failedLogins },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

/** Lixeira: tudo que foi excluído (soft delete), inclusive as privadas. */
export async function listTrashController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const page = parsePage(request.query.page);
    const skip = (page - 1) * PAGE_SIZE;
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const visibility = typeof request.query.visibility === "string" ? request.query.visibility : "all";

    const filter: Record<string, unknown> = { active: false };

    if (visibility === "public") {
      filter.isPublic = true;
    } else if (visibility === "private") {
      filter.isPublic = false;
    }

    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ placeName: regex }, { locationLabel: regex }, { createdByName: regex }];
    }

    const [items, total] = await Promise.all([
      Review.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Review.countDocuments(filter),
    ]);

    return response.status(200).json({
      items: (items as Array<Record<string, unknown>>).map((review) => ({
        _id: review._id,
        placeName: review.placeName ?? "",
        locationLabel: review.locationLabel ?? "",
        isDelivery: review.isDelivery === true,
        placeRating: typeof review.placeRating === "number" ? review.placeRating : 0,
        opinionOne: typeof review.opinionOne === "string" ? review.opinionOne : "",
        opinionTwo: typeof review.opinionTwo === "string" ? review.opinionTwo : "",
        criticalWarnings: Array.isArray(review.criticalWarnings) ? review.criticalWarnings : [],
        isPublic: review.isPublic !== false,
        active: false,
        id_casal: review.id_casal == null ? "" : String(review.id_casal),
        createdByUserId: typeof review.createdByUserId === "string" ? review.createdByUserId : null,
        createdByName: typeof review.createdByName === "string" ? review.createdByName : null,
        publisherLabel: typeof review.createdByName === "string" ? review.createdByName : null,
        visitedAt: review.visitedAt ?? review.createdAt,
        createdAt: review.createdAt,
        updatedAt: review.updatedAt,
      })),
      meta: { page, pageSize: PAGE_SIZE, total, hasMore: skip + items.length < total },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

/** Ocorrências: histórico de quem fez o quê. */
export async function listAuditLogsController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const page = parsePage(request.query.page);
    const skip = (page - 1) * PAGE_SIZE;
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const action = typeof request.query.action === "string" ? request.query.action.trim() : "";

    const filter: Record<string, unknown> = {};

    if (action && action !== "all") {
      // "review" casa com review.create, review.trash, etc.
      filter.action = action.includes(".") ? action : { $regex: `^${escapeRegex(action)}\\.`, $options: "i" };
    }

    if (q) {
      const regex = { $regex: escapeRegex(q), $options: "i" };
      filter.$or = [{ actorName: regex }, { actorLogin: regex }, { targetLabel: regex }, { action: regex }];
    }

    const [items, total] = await Promise.all([
      AuditLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      AuditLog.countDocuments(filter),
    ]);

    return response.status(200).json({
      items: (items as Array<Record<string, unknown>>).map((log) => ({
        id: String(log._id),
        action: log.action,
        actorId: log.actorId ?? null,
        actorName: log.actorName ?? "",
        actorLogin: log.actorLogin ?? "",
        actorRole: typeof log.actorRole === "number" ? log.actorRole : 0,
        targetType: log.targetType ?? "system",
        targetId: log.targetId ?? null,
        targetLabel: log.targetLabel ?? "",
        details: log.details ?? {},
        ip: log.ip ?? "",
        createdAt: log.createdAt,
      })),
      meta: { page, pageSize: PAGE_SIZE, total, hasMore: skip + items.length < total },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

/**
 * Limpeza por período. `target: "trash"` apaga de vez o que está na lixeira
 * desde antes da data; `target: "logs"` apaga ocorrências antigas.
 * Sem `before` válido não roda nada.
 */
export async function purgeController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const body = (request.body ?? {}) as Record<string, unknown>;
    const target = body.target === "logs" ? "logs" : body.target === "trash" ? "trash" : null;
    const before = parseDateInput(body.before);

    if (!target) {
      return response.status(400).json({ message: "Escolha o que limpar: lixeira ou ocorrências." });
    }

    if (!before) {
      return response.status(400).json({ message: "Informe uma data válida para a limpeza." });
    }

    if (before.getTime() > Date.now()) {
      return response.status(400).json({ message: "A data da limpeza não pode estar no futuro." });
    }

    if (target === "trash") {
      const filter = { active: false, updatedAt: { $lt: before } };
      const preview = await Review.find(filter).select({ placeName: 1 }).limit(5).lean();
      const result = await Review.deleteMany(filter);

      await recordAudit(request, {
        action: "trash.purge",
        targetType: "system",
        details: {
          before: before.toISOString(),
          removed: result.deletedCount ?? 0,
          examples: (preview as Array<Record<string, unknown>>).map((item) => item.placeName),
        },
      });

      return response.status(200).json({ removed: result.deletedCount ?? 0 });
    }

    const filter = { createdAt: { $lt: before } };
    const result = await AuditLog.deleteMany(filter);

    await recordAudit(request, {
      action: "logs.purge",
      targetType: "system",
      details: { before: before.toISOString(), removed: result.deletedCount ?? 0 },
    });

    return response.status(200).json({ removed: result.deletedCount ?? 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

/** Esvazia a lixeira de uma avaliação específica (exclusão definitiva). */
export async function deleteTrashedReviewController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const id = Array.isArray(request.params.id) ? request.params.id[0] : request.params.id;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "ID de avaliação inválido." });
    }

    const review = await Review.findById(id);

    if (!review) {
      return response.status(404).json({ message: "Avaliação não encontrada." });
    }

    await Review.deleteOne({ _id: review._id });

    await recordAudit(request, {
      action: "review.delete",
      targetType: "review",
      targetId: String(review._id),
      targetLabel: review.placeName,
      details: { isPublic: review.isPublic !== false, from: "lixeira" },
    });

    return response.status(200).json({ id: String(review._id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}
