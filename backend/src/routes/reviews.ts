import { Router } from "express";
import { parseReviewPayload } from "../utils/parse-review.js";
import {
  createReviewRecord,
  findReviewByClientId,
  getReviewDriver,
  listReviews,
} from "../data/review-store.js";

export const reviewsRouter = Router();

reviewsRouter.get("/", async (req, res) => {
  try {
    const query = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const reviews = await listReviews(query);
    res.json({
      storage: getReviewDriver(),
      items: reviews,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    res.status(500).json({ message });
  }
});

reviewsRouter.post("/", async (req, res) => {
  try {
    const payload = parseReviewPayload(req.body);

    const existing = await findReviewByClientId(payload.syncMeta.clientReviewId);

    if (existing) {
      return res.status(200).json({
        storage: getReviewDriver(),
        item: existing,
      });
    }

    const review = await createReviewRecord(payload);
    return res.status(201).json({
      storage: getReviewDriver(),
      item: review,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return res.status(400).json({ message });
  }
});
