import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { reviewsRouter } from "./routes/reviews.js";

export const app = express();
const allowedOrigins = env.clientOrigin
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`Origin not allowed: ${origin}`));
    },
  })
);
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "avalieitor-api",
    storageMode: env.storageMode,
    now: new Date().toISOString(),
  });
});

app.use("/api/auth", authRouter);
app.use("/api/admin", adminRouter);
app.use("/api/reviews", reviewsRouter);
