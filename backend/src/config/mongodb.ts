import mongoose from "mongoose";
import { env } from "./env.js";
import { setReviewDriver } from "../data/review-store.js";
// @ts-ignore
import { Review } from "../models/Review.js";
// @ts-ignore
import { User } from "../models/User.js";

let isConnected = false;

const LEGACY_REVIEW_INDEXES = [
  "syncMeta.clientReviewId_1",
  "tags_1",
  "visitedAt_1",
  "placeName_text_locationLabel_text_redFlags_text",
];

const LEGACY_USER_INDEXES = [
  "email_1",
];

async function cleanupLegacyReviewIndexes() {
  const database = mongoose.connection.db;
  if (!database) {
    return;
  }

  const collection = database.collection("reviews");
  const indexes = await collection.indexes();
  const indexNames = new Set(indexes.map((index) => index.name));

  for (const indexName of LEGACY_REVIEW_INDEXES) {
    if (indexNames.has(indexName)) {
      await collection.dropIndex(indexName);
      console.warn(`Dropped legacy review index: ${indexName}`);
    }
  }

  await Review.syncIndexes();
}

async function cleanupLegacyUserIndexes() {
  const database = mongoose.connection.db;
  if (!database) {
    return;
  }

  const collection = database.collection("users");
  const indexes = await collection.indexes();
  const indexNames = new Set(indexes.map((index) => index.name));

  for (const indexName of LEGACY_USER_INDEXES) {
    if (indexNames.has(indexName)) {
      await collection.dropIndex(indexName);
      console.warn(`Dropped legacy user index: ${indexName}`);
    }
  }

  await User.syncIndexes();
}

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
    await cleanupLegacyReviewIndexes();
    await cleanupLegacyUserIndexes();
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
