import { Router } from "express";
import {
  createReviewController,
  deleteReviewController,
  listReviewsController,
  updateReviewController,
} from "../controllers/reviews-controller.js";
import { optionalAuth, requireAuth, requireRoleAtLeast } from "../middlewares/auth.js";

export const reviewsRouter = Router();

reviewsRouter.use(optionalAuth);

reviewsRouter.get("/", listReviewsController);
reviewsRouter.post("/", requireAuth, requireRoleAtLeast(1), createReviewController);
reviewsRouter.put("/:id", requireAuth, requireRoleAtLeast(1), updateReviewController);
reviewsRouter.delete("/:id", requireAuth, requireRoleAtLeast(1), deleteReviewController);
