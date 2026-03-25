import { Review } from "../models/review.js";

type ReviewPayload = {
  placeName: string;
  locationLabel: string;
  coupleRating: number;
  myOpinion: string;
  herOpinion: string;
  redFlags: string[];
  tags: string[];
  visitedAt: Date;
  syncMeta: {
    source: string;
    clientReviewId: string;
    lastSyncedAt: Date;
  };
};

type StoredReview = ReviewPayload & {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
};

const memoryReviews: StoredReview[] = [];

let activeDriver: "mongo" | "memory" = "memory";

export function setReviewDriver(driver: "mongo" | "memory") {
  activeDriver = driver;
}

export function getReviewDriver() {
  return activeDriver;
}

export async function listReviews(query: string) {
  if (activeDriver === "mongo") {
    const filter = query
      ? {
          $or: [
            { placeName: { $regex: query, $options: "i" } },
            { locationLabel: { $regex: query, $options: "i" } },
            { redFlags: { $elemMatch: { $regex: query, $options: "i" } } },
          ],
        }
      : {};

    return Review.find(filter).sort({ visitedAt: -1, createdAt: -1 }).limit(20);
  }

  const normalized = query.trim().toLowerCase();

  return memoryReviews
    .filter((review) => {
      if (!normalized) {
        return true;
      }

      return (
        review.placeName.toLowerCase().includes(normalized) ||
        review.locationLabel.toLowerCase().includes(normalized) ||
        review.redFlags.some((flag) => flag.toLowerCase().includes(normalized))
      );
    })
    .sort((a, b) => b.visitedAt.getTime() - a.visitedAt.getTime())
    .slice(0, 20);
}

export async function findReviewByClientId(clientReviewId: string) {
  if (activeDriver === "mongo") {
    return Review.findOne({ "syncMeta.clientReviewId": clientReviewId });
  }

  return (
    memoryReviews.find((review) => review.syncMeta.clientReviewId === clientReviewId) ?? null
  );
}

export async function createReviewRecord(payload: ReviewPayload) {
  if (activeDriver === "mongo") {
    return Review.create(payload);
  }

  const now = new Date();
  const review: StoredReview = {
    ...payload,
    _id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };

  memoryReviews.unshift(review);
  return review;
}
