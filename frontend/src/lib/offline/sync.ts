import { createReview } from "@/lib/api/reviews";
import { db, type LocalQueuedReview } from "@/lib/offline/db";

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

export async function saveReviewOffline(review: Omit<LocalQueuedReview, "createdAt" | "status">) {
  await db.queuedReviews.put({
    ...review,
    createdAt: new Date().toISOString(),
    status: "pending",
  });
}

export async function syncPendingReviews(token: string | null) {
  if (!token) {
    return;
  }

  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return;
  }

  const pendingReviews = await db.queuedReviews.where("status").anyOf("pending", "failed").toArray();

  for (const review of pendingReviews) {
    await db.queuedReviews.update(review.localId, { status: "syncing" });

    try {
      await createReview(review, token);
      await db.queuedReviews.delete(review.localId);
      await notifyListeners();
    } catch (error) {
      console.error("Could not sync queued review", error);
      await db.queuedReviews.update(review.localId, { status: "failed" });
    }
  }
}
