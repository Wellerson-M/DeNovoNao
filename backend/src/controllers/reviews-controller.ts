import type { Request, Response } from "express";
import mongoose from "mongoose";
// @ts-ignore
import { Review } from "../models/Review.js";
import { getReviewDriver } from "../data/review-store.js";
import { parseCreateReviewInput, parseDeleteMode, parseUpdateReviewInput } from "../utils/parse-review-input.js";

const PAGE_SIZE = 10;

function getRouteId(value: string | string[]) {
  return Array.isArray(value) ? value[0] ?? "" : value;
}

function buildFeedFilter(request: Request) {
  const query = typeof request.query.q === "string" ? request.query.q.trim() : "";
  const placeName = typeof request.query.placeName === "string" ? request.query.placeName.trim() : "";
  const locationLabel =
    typeof request.query.locationLabel === "string" ? request.query.locationLabel.trim() : "";
  const idCasal = request.authUser?.id_casal ?? null;

  const baseVisibility = idCasal
    ? {
        active: true,
        $or: [{ isPublic: true }, { isPublic: false, id_casal: idCasal }],
      }
    : {
        active: true,
        isPublic: true,
      };

  const extraFilters: Record<string, unknown>[] = [];

  if (query) {
    extraFilters.push({
      $or: [
        { placeName: { $regex: query, $options: "i" } },
        { locationLabel: { $regex: query, $options: "i" } },
        { opinionOne: { $regex: query, $options: "i" } },
        { opinionTwo: { $regex: query, $options: "i" } },
        { criticalWarnings: { $elemMatch: { $regex: query, $options: "i" } } },
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

  if (extraFilters.length === 0) {
    return baseVisibility;
  }

  return {
    $and: [baseVisibility, ...extraFilters],
  };
}

async function ensureMongo(response: Response) {
  if (getReviewDriver() !== "mongo") {
    response.status(503).json({ message: "Review API requires MongoDB storage" });
    return false;
  }

  return true;
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
      Review.find(filter).sort({ createdAt: -1 }).skip(skip).limit(PAGE_SIZE),
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
            average: { $avg: "$placeRating" },
          },
        },
      ]);

      if (averageResult[0]?.average) {
        averagePlaceRating = Number(averageResult[0].average.toFixed(2));
      }
    }

    response.json({
      items,
      meta: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: skip + items.length < total,
        averagePlaceRating,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    response.status(500).json({ message });
  }
}

export async function createReviewController(request: Request, response: Response) {
  if (!(await ensureMongo(response))) {
    return;
  }

  try {
    const authUser = request.authUser!;

    if (!authUser.id_casal) {
      return response.status(403).json({ message: "User must belong to a couple group" });
    }

    const payload = parseCreateReviewInput(request.body);
    const review = await Review.create({
      ...payload,
      id_casal: authUser.id_casal,
    });

    return response.status(201).json({ item: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
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
      return response.status(400).json({ message: "Invalid review id" });
    }

    const review = await Review.findById(id);
    if (!review) {
      return response.status(404).json({ message: "Review not found" });
    }

    if (authUser.role < 2 && review.id_casal !== authUser.id_casal) {
      return response.status(403).json({ message: "You cannot edit this review" });
    }

    const patch = parseUpdateReviewInput(request.body);
    Object.assign(review, patch);
    await review.save();

    return response.status(200).json({ item: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
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
      return response.status(400).json({ message: "Invalid review id" });
    }

    const mode = parseDeleteMode(request.body ?? {});
    const review = await Review.findById(id);

    if (!review) {
      return response.status(404).json({ message: "Review not found" });
    }

    if (authUser.role < 2 && review.id_casal !== authUser.id_casal) {
      return response.status(403).json({ message: "You cannot delete this review" });
    }

    if (mode === "hard") {
      await Review.deleteOne({ _id: review._id });
      return response.status(200).json({ mode, item: review });
    }

    review.active = false;
    await review.save();
    return response.status(200).json({ mode, item: review });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return response.status(400).json({ message });
  }
}
