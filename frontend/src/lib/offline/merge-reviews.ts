import type { LocalQueuedReview } from "@/lib/offline/db";
import type { ReviewRecord } from "@/lib/types";

export function mergeReviews(remoteReviews: ReviewRecord[], localReviews: LocalQueuedReview[]) {
  const queued: ReviewRecord[] = localReviews.map((review) => ({
    id: review.localId,
    id_casal: "local-only",
    placeName: review.placeName,
    locationLabel: review.locationLabel,
    placeRating: review.placeRating,
    opinionOne: review.opinionOne,
    opinionTwo: review.opinionTwo,
    criticalWarnings: review.criticalWarnings,
    isPublic: review.isPublic,
    active: true,
    createdAt: review.createdAt,
    updatedAt: review.createdAt,
    syncStatus: review.status,
    localOnly: true,
  }));

  return [...queued, ...remoteReviews].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}
