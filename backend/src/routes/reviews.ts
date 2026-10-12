import { Router } from "express";
import {
  createReviewController,
  deleteReviewController,
  listReviewsController,
  photoSignatureController,
  updateReviewController,
} from "../controllers/reviews-controller.js";
import { optionalAuth, requireAuth, requireRoleAtLeast } from "../middlewares/auth.js";

export const reviewsRouter = Router();

reviewsRouter.use(optionalAuth);

reviewsRouter.get("/", listReviewsController);
reviewsRouter.post("/photos/signature", requireAuth, requireRoleAtLeast(1), photoSignatureController);
reviewsRouter.post("/", requireAuth, requireRoleAtLeast(1), createReviewController);
reviewsRouter.put("/:id", requireAuth, requireRoleAtLeast(1), updateReviewController);
reviewsRouter.delete("/:id", requireAuth, requireRoleAtLeast(1), deleteReviewController);
