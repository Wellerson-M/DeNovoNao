import dotenv from "dotenv";

dotenv.config();

export const env = {
  port: Number(process.env.PORT ?? 4000),
  mongoUri: process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/avalieitor",
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:3000,http://127.0.0.1:3000",
  storageMode: process.env.STORAGE_MODE ?? "auto",
};
