import type { Request, Response } from "express";
import mongoose from "mongoose";
// @ts-ignore
import { Review } from "../models/Review.js";
// @ts-ignore
import { User } from "../models/User.js";
import { getReviewDriver } from "../data/review-store.js";
import { parseCreateReviewInput, parseDeleteMode, parseUpdateReviewInput } from "../utils/parse-review-input.js";

const PAGE_SIZE = 10;

function getRouteId(value: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function resolveReviewOwnerIdCasal(review: Record<string, unknown>) {
  if (review.id_casal != null && String(review.id_casal).trim()) {
    return String(review.id_casal).trim();
  }

  if (typeof review.createdBy === "string" && review.createdBy.trim()) {
    return review.createdBy.trim();
  }

  return null;
}

function buildFeedFilter(request: Request) {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const placeName = typeof request.query.placeName === "string" ? request.query.placeName.trim() : "";
  const locationLabel =
    typeof request.query.locationLabel === "string" ? request.query.locationLabel.trim() : "";
  const rating = typeof request.query.rating === "string" ? Number(request.query.rating) : null;
  const idCasal = request.authUser?.id_casal ?? null;

  const baseVisibility = idCasal
    ? {
        active: true,
        $or: [{ isPublic: true }, { isPublic: { $exists: false } }, { isPublic: false, id_casal: idCasal }],
      }
    : {
        active: true,
        $or: [{ isPublic: true }, { isPublic: { $exists: false } }],
      };

  const extraFilters: Record<string, unknown>[] = [];
  if (query) {
    extraFilters.push({
      $or: [
        { placeName: { $regex: query, $options: "i" } },
        { locationLabel: { $regex: query, $options: "i" } },
      ],
    });
  }

  if (placeName) {
    extraFilters.push({
      placeName: { $regex: `^${placeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
    });
  }

  if (locationLabel) {
    extraFilters.push({
      locationLabel: {
        $regex: `^${locationLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        $options: "i",
      },
    });
  }

  if (rating && rating >= 1 && rating <= 5) {
    extraFilters.push({
      $or: [{ placeRating: rating }, { coupleRating: rating }],
    });
  }

  if (extraFilters.length === 0) {
    return baseVisibility;
  }

  return {
    $and: [baseVisibility, ...extraFilters],
  };
}

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "A API de avaliações exige conexão com o MongoDB." });
    return false;
  }

  return true;
}

function normalizeReviewDocument(review: Record<string, unknown>) {
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

async function attachPublisherLabels(items: Array<ReturnType<typeof normalizeReviewDocument>>) {
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

export async function listReviewsController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const page = Math.max(Number(request.query.page ?? 1) || 1, 1);
    const filter = buildFeedFilter(request);
    const skip = (page - 1) * PAGE_SIZE;

    const [items, total] = await Promise.all([
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE).lean(),
      Review.countDocuments(filter),
    ]);

    let averagePlaceRating: number | null = null;
    const placeName = typeof request.query.placeName === "string" ? request.query.placeName.trim() : "";

    if (placeName) {
      const averageResult = await Review.aggregate([
        {
          $match: {
            active: true,
            isPublic: true,
            placeName: { $regex: `^${placeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
          },
        },
        {
          $group: {
            _id: null,
            average: {
              $avg: {
                $ifNull: ["$placeRating", "$coupleRating"],
              },
            },
          },
        },
      ]);

      if (averageResult[0]?.average) {
        averagePlaceRating = Number(averageResult[0].average.toFixed(2));
      }
    }

    const normalizedItems = items.map(normalizeReviewDocument);
    const itemsWithLabels = await attachPublisherLabels(normalizedItems);

    response.json({
      items: itemsWithLabels,
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + items.length < total,
        averagePlaceRating,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado";
    response.status(500).json({ message });
  }
}

export async function createReviewController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const authUser = request.authUser!;
    const currentUser = (await User.findById(authUser.id).lean()) as Record<string, unknown> | null;

    if (!authUser.id_casal) {
      return response.status(403).json({ message: "Seu usuário precisa estar vinculado a um casal para publicar." });
    }

    const payload = parseCreateReviewInput(request.body);
    const review = await Review.create({
      ...payload,
      id_casal: authUser.id_casal,
      createdByUserId: authUser.id,
      createdByName:
        currentUser && typeof currentUser.name === "string" && currentUser.name.trim()
          ? currentUser.name.trim()
          : "",
    });

    return response.status(201).json({ item: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível publicar a avaliação.";
    return response.status(400).json({ message });
  }
}

export async function updateReviewController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const authUser = request.authUser!;
    const id = getRouteId(request.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "ID de avaliação inválido." });
    }

    const review = await Review.findById(id);
    if (!review) {
      return response.status(404).json({ message: "Avaliação não encontrada." });
    }

    if (authUser.role < 2 && resolveReviewOwnerIdCasal(review.toObject()) !== authUser.id_casal) {
      return response.status(403).json({ message: "Você não pode editar esta avaliação." });
    }

    const patch = parseUpdateReviewInput(request.body);
    Object.assign(review, patch);
    await review.save();

    return response.status(200).json({ item: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível editar a avaliação.";
    return response.status(400).json({ message });
  }
}

export async function deleteReviewController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const authUser = request.authUser!;
    const id = getRouteId(request.params.id);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return response.status(400).json({ message: "ID de avaliação inválido." });
    }

    const mode = parseDeleteMode(request.body ?? {});
    const review = await Review.findById(id);

    if (!review) {
      return response.status(404).json({ message: "Avaliação não encontrada." });
    }

    if (authUser.role < 2 && resolveReviewOwnerIdCasal(review.toObject()) !== authUser.id_casal) {
      return response.status(403).json({ message: "Você não pode excluir esta avaliação." });
    }

    if (mode === "hard") {
      await Review.deleteOne({ _id: review._id });
      return response.status(200).json({ mode, item: review });
    }

    review.active = false;
    await review.save();
    return response.status(200).json({ mode, item: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Não foi possível excluir a avaliação.";
    return response.status(400).json({ message });
  }
}


