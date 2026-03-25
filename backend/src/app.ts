import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
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

app.use("/api/reviews", reviewsRouter);
