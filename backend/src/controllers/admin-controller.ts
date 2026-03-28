import mongoose from "mongoose";
import type { Request, Response } from "express";
// @ts-ignore
import { User } from "../models/User.js";
// @ts-ignore
import { Review } from "../models/Review.js";
import { getReviewDriver } from "../data/review-store.js";

const PAGE_SIZE = 10;

function getRouteId(value: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "A área administrativa exige conexão com o MongoDB" });
    return false;
  }

  return true;
}

function parseUserPatch(body: unknown) {
  if (!body || typeof body !== "object") {
    throw new Error("Corpo da requisição inválido");
  }

  const input = body as Record<string, unknown>;
  const patch: Record<string, unknown> = {};

  if (typeof input.name === "string") {
    const name = input.name.trim();
    if (name.length < 2) {
      throw new Error("O nome precisa ter pelo menos 2 caracteres");
    }
    patch.name = name;
  }

  if (typeof input.login === "string") {
    const login = input.login.trim().toLowerCase();
    if (!/^[a-zA-Z0-9._-]{3,30}$/.test(login)) {
      throw new Error("Login inválido");
    }
    patch.login = login;
  }

  if (typeof input.email === "string") {
    const email = input.email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error("Email inválido");
    }
    patch.email = email;
  }

  if (typeof input.id_casal === "string") {
    patch.id_casal = input.id_casal.trim() || null;
  } else if (typeof input.id_casal === "number") {
    patch.id_casal = String(input.id_casal);
  } else if (input.id_casal === null) {
    patch.id_casal = null;
  }

  if (typeof input.role === "number" && [0, 1, 2].includes(input.role)) {
    patch.role = input.role;
  }

  if (typeof input.active === "boolean") {
    patch.active = input.active;
  }

  return patch;
}

function normalizeAdminReview(review: Record<string, unknown>) {
  const createdByName =
    typeof review.createdByName === "string" && review.createdByName.trim()
      ? review.createdByName.trim()
      : typeof review.createdBy === "string" && review.createdBy.trim()
        ? review.createdBy.trim()
        : null;

  return {
    _id: review._id,
    id_casal:
      review.id_casal == null
        ? typeof review.createdBy === "string" && review.createdBy.trim()
          ? review.createdBy.trim()
          : "legacy"
        : String(review.id_casal),
    placeName: typeof review.placeName === "string" ? review.placeName : "",
    locationLabel: typeof review.locationLabel === "string" ? review.locationLabel : "",
    isDelivery: typeof review.isDelivery === "boolean" ? review.isDelivery : false,
    placeRating:
      typeof review.placeRating === "number"
        ? review.placeRating
        : typeof review.coupleRating === "number"
          ? review.coupleRating
          : 0,
    opinionOne:
      typeof review.opinionOne === "string"
        ? review.opinionOne
        : typeof review.myOpinion === "string"
          ? review.myOpinion
          : "",
    opinionTwo:
      typeof review.opinionTwo === "string"
        ? review.opinionTwo
        : typeof review.herOpinion === "string"
          ? review.herOpinion
          : "",
    criticalWarnings: Array.isArray(review.criticalWarnings)
      ? review.criticalWarnings
      : Array.isArray(review.redFlags)
        ? review.redFlags
        : [],
    isPublic: typeof review.isPublic === "boolean" ? review.isPublic : true,
    active: typeof review.active === "boolean" ? review.active : true,
    createdByUserId:
      typeof review.createdByUserId === "string" && review.createdByUserId.trim()
        ? review.createdByUserId.trim()
        : null,
    createdByName,
    publisherLabel: createdByName,
    visitedAt: review.visitedAt ?? review.createdAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

async function attachPublisherLabels(items: Array<ReturnType<typeof normalizeAdminReview>>) {
  const idCasais = Array.from(new Set(items.map((item) => item.id_casal).filter(Boolean)));
  if (idCasais.length === 0) {
    return items;
  }

  const users = await User.find({ id_casal: { $in: idCasais }, active: true }).sort({ name: 1 }).lean();
  const namesByCouple = new Map<string, string[]>();

  for (const user of users as Array<Record<string, unknown>>) {
    const coupleId = user.id_casal == null ? null : String(user.id_casal).trim();
    const name = typeof user.name === "string" ? user.name.trim() : "";

    if (!coupleId || !name) {
      continue;
    }

    const current = namesByCouple.get(coupleId) ?? [];
    if (!current.includes(name)) {
      current.push(name);
    }
    namesByCouple.set(coupleId, current);
  }

  return items.map((item) => ({
    ...item,
    publisherLabel: item.publisherLabel ?? namesByCouple.get(item.id_casal)?.join(" + ") ?? null,
  }));
}

function buildAdminReviewFilter(q: string, idCasal?: string) {
  const base = idCasal ? { id_casal: idCasal } : {};
  const ratingMatch = q.match(/\b([1-5])\b/);
  const ratingValue = ratingMatch ? Number(ratingMatch[1]) : null;

  if (!q) {
    return base;
  }

  return {
    ...base,
    $or: [
      { placeName: { $regex: q, $options: "i" } },
      { locationLabel: { $regex: q, $options: "i" } },
      { opinionOne: { $regex: q, $options: "i" } },
      { opinionTwo: { $regex: q, $options: "i" } },
      { criticalWarnings: { $elemMatch: { $regex: q, $options: "i" } } },
      { myOpinion: { $regex: q, $options: "i" } },
      { herOpinion: { $regex: q, $options: "i" } },
      { redFlags: { $elemMatch: { $regex: q, $options: "i" } } },
      ...(ratingValue ? [{ placeRating: ratingValue }, { coupleRating: ratingValue }] : []),
    ],
  };
}

export async function listAdminUsersController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const filter = q
      ? {
          $or: [
            { name: { $regex: q, $options: "i" } },
            { login: { $regex: q, $options: "i" } },
            { email: { $regex: q, $options: "i" } },
            { id_casal: { $regex: q, $options: "i" } },
          ],
        }
      : {};

    const users = await User.find(filter).sort({ name: 1, email: 1 });

    return response.status(200).json({
      items: users.map((user: InstanceType<typeof User>) => ({
        id: String(user._id),
        name: user.name,
        login: user.login ?? null,
        email: user.email,
        role: user.role,
        id_casal: user.id_casal ?? null,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

export async function updateAdminUserController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const id = getRouteId(request.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "ID de usuário inválido" });
    }

    const patch = parseUserPatch(request.body);
    const user = await User.findById(id);

    if (!user) {
      return response.status(404).json({ message: "Usuário não encontrado" });
    }

    if (patch.login && patch.login !== user.login) {
      const loginInUse = await User.findOne({ login: patch.login, _id: { $ne: user._id } });
      if (loginInUse) {
        return response.status(409).json({ message: "Este login já está em uso" });
      }
    }

    if (patch.email && patch.email !== user.email) {
      const emailInUse = await User.findOne({ email: patch.email, _id: { $ne: user._id } });
      if (emailInUse) {
        return response.status(409).json({ message: "Este email já está em uso" });
      }
    }

    const previousCoupleId = user.id_casal == null ? null : String(user.id_casal).trim() || null;
    Object.assign(user, patch);
    await user.save();

    const nextCoupleId = user.id_casal == null ? null : String(user.id_casal).trim() || null;
    if (previousCoupleId !== nextCoupleId) {
      await Review.updateMany(
        {
          createdByUserId: String(user._id),
        },
        {
          $set: {
            id_casal: nextCoupleId,
          },
        }
      );
    }

    return response.status(200).json({
      item: {
        id: String(user._id),
        name: user.name,
        login: user.login ?? null,
        email: user.email,
        role: user.role,
        id_casal: user.id_casal ?? null,
        active: user.active,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(400).json({ message });
  }
}

export async function deleteAdminUserController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const id = getRouteId(request.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "ID de usuário inválido" });
    }

    if (request.authUser?.id && String(request.authUser.id) === id) {
      return response.status(400).json({ message: "Você não pode excluir o seu próprio usuário" });
    }

    const user = await User.findById(id);
    if (!user) {
      return response.status(404).json({ message: "Usuário não encontrado" });
    }

    await Review.updateMany(
      {
        createdByUserId: String(user._id),
      },
      {
        $set: {
          active: false,
        },
      }
    );

    await User.deleteOne({ _id: user._id });

    return response.status(200).json({
      message: "Usuário excluído com sucesso",
      item: {
        id: String(user._id),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(400).json({ message });
  }
}

export async function listAdminReviewsController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const page = Math.max(Number(request.query.page ?? 1) || 1, 1);
    const skip = (page - 1) * PAGE_SIZE;
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const sort = typeof request.query.sort === "string" ? request.query.sort.trim() : "alpha";
    const filter = buildAdminReviewFilter(q);
    const sortBy: Record<string, 1 | -1> =
      sort === "recent" ? { visitedAt: -1, createdAt: -1 } : { placeName: 1, visitedAt: -1, createdAt: -1 };

    const [items, total] = await Promise.all([
      Review.find(filter).sort(sortBy).skip(skip).limit(PAGE_SIZE).lean(),
      Review.countDocuments(filter),
    ]);

    const normalized = items.map((review: Record<string, unknown>) => normalizeAdminReview(review));
    const withLabels = await attachPublisherLabels(normalized);

    return response.status(200).json({
      items: withLabels,
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + items.length < total,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}

export async function listAdminUserReviewsController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const id = getRouteId(request.params.id);
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "ID de usuário inválido" });
    }

    const user = (await User.findById(id).lean()) as Record<string, unknown> | null;
    if (!user) {
      return response.status(404).json({ message: "Usuário não encontrado" });
    }

    const idCasal = user.id_casal == null ? null : String(user.id_casal).trim();
    if (!idCasal) {
      return response.status(200).json({
        items: [],
        meta: { page: 1, pageSize: PAGE_SIZE, total: 0, hasMore: false },
      });
    }

    const page = Math.max(Number(request.query.page ?? 1) || 1, 1);
    const skip = (page - 1) * PAGE_SIZE;
    const q = typeof request.query.q === "string" ? request.query.q.trim() : "";
    const filter = buildAdminReviewFilter(q, idCasal);

    const [items, total] = await Promise.all([
      Review.find(filter).sort({ visitedAt: -1, createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Review.countDocuments(filter),
    ]);

    const normalized = items.map((review: Record<string, unknown>) => normalizeAdminReview(review));
    const withLabels = await attachPublisherLabels(normalized);

    return response.status(200).json({
      items: withLabels,
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + items.length < total,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    return response.status(500).json({ message });
  }
}


