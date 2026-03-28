import { Router } from "express";
import {
  deleteAdminUserController,
  listAdminReviewsController,
  listAdminUserReviewsController,
  listAdminUsersController,
  updateAdminUserController,
} from "../controllers/admin-controller.js";
import { optionalAuth, requireAuth, requireRoleAtLeast } from "../middlewares/auth.js";

export const adminRouter = Router();

adminRouter.use(optionalAuth);
adminRouter.use(requireAuth, requireRoleAtLeast(2));

adminRouter.get("/users", listAdminUsersController);
adminRouter.get("/users/:id/reviews", listAdminUserReviewsController);
adminRouter.put("/users/:id", updateAdminUserController);
adminRouter.delete("/users/:id", deleteAdminUserController);
adminRouter.get("/reviews", listAdminReviewsController);
