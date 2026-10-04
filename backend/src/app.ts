import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { adminRouter } from "./routes/admin.js";
import { authRouter } from "./routes/auth.js";
import { reviewsRouter } from "./routes/reviews.js";

export const app = express();
// Cada item de CLIENT_ORIGIN pode ter "*" como curinga, ex.:
// https://denovonao-*.vercel.app libera todos os previews de branch do Vercel.
const allowedOrigins = [env.clientOrigin, env.previewOrigins]
  .join(",")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) => new RegExp(`^${origin.split("*").map((part) => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[a-z0-9-]*")}$`, "i"));

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.some((pattern) => pattern.test(origin))) {
        return callback(null, true);
      }

      // Sem cabeçalhos CORS o navegador bloqueia a resposta; não precisa virar erro 500.
      return callback(null, false);
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
