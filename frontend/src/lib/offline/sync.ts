import { createReview } from "@/lib/api/reviews";
import { db, type LocalReview } from "./db";

type SyncListener = () => void | Promise<void>;

const listeners = new Set<SyncListener>();

export function subscribeSync(listener: SyncListener) {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

async function notifyListeners() {
  for (const listener of listeners) {
    await listener();
  }
}

export async function syncPendingReviews() {
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  const pending = await db.reviews.where("status").anyOf("pending", "failed").toArray();

  for (const review of pending) {
    await db.reviews.update(review.clientReviewId, { status: "syncing" });

    try {
      await createReview(review, review.clientReviewId);
      await db.reviews.delete(review.clientReviewId);
      await notifyListeners();
    } catch (error) {
      console.error("Could not sync review", error);
      await db.reviews.update(review.clientReviewId, { status: "failed" });
    }
  }
}

export async function saveReviewOffline(review: Omit<LocalReview, "status" | "createdAt">) {
  await db.reviews.put({
    ...review,
    createdAt: new Date().toISOString(),
    status: "pending",
  });
}
