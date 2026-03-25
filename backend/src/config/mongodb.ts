import mongoose from "mongoose";
import { env } from "./env.js";
import { setReviewDriver } from "../data/review-store.js";

let isConnected = false;

export async function connectMongo() {
  if (env.storageMode === "memory") {
    setReviewDriver("memory");
    console.warn("Mongo disabled. Using in-memory storage.");
    return null;
  }

  if (isConnected) {
    setReviewDriver("mongo");
    return mongoose.connection;
  }

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 4000,
    });
    isConnected = true;
    setReviewDriver("mongo");
    return mongoose.connection;
  } catch (error) {
    setReviewDriver("memory");
    console.warn("Could not connect to MongoDB. Falling back to in-memory storage.");
    console.warn(error instanceof Error ? error.message : error);
    return null;
  }
}
