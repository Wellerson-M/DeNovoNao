import type { LocalQueuedReview } from "@/lib/offline/db";
import type { ReviewRecord } from "@/lib/types";

export function mergeReviews(remoteReviews: ReviewRecord[], localReviews: LocalQueuedReview[]) {
  const queued: ReviewRecord[] = localReviews.map((review) => ({
    id: review.localId,
    id_casal: "local-only",
    placeName: review.placeName,
    locationLabel: review.locationLabel,
    isDelivery: review.isDelivery,
    placeRating: review.placeRating,
    opinionOne: review.opinionOne,
    opinionTwo: review.opinionTwo,
    criticalWarnings: review.criticalWarnings,
    visitedAt: review.visitedAt ?? review.createdAt,
    isPublic: review.isPublic,
    active: true,
    createdByUserId: null,
    createdByName: null,
    createdAt: review.createdAt,
    updatedAt: review.createdAt,
    syncStatus: review.status,
    localOnly: true,
  }));

  return [...queued, ...remoteReviews].sort(
    (left, right) =>
      new Date(right.visitedAt || right.createdAt).getTime() -
      new Date(left.visitedAt || left.createdAt).getTime()
  );
}
