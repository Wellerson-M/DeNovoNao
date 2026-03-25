import { LocalReview } from "@/lib/offline/db";
import { ReviewRecord } from "@/lib/types";

export function mergeReviews(serverReviews: ReviewRecord[], localReviews: LocalReview[]) {
  const pendingMapped: ReviewRecord[] = localReviews.map((review) => ({
    id: review.clientReviewId,
    clientReviewId: review.clientReviewId,
    placeName: review.placeName,
    locationLabel: review.locationLabel,
    coupleRating: review.coupleRating,
    myOpinion: review.myOpinion,
    herOpinion: review.herOpinion,
    redFlags: review.redFlags,
    visitedAt: review.visitedAt,
    createdAt: review.createdAt,
    syncStatus: review.status,
  }));

  const knownIds = new Set(
    serverReviews
      .map((review) => review.clientReviewId)
      .filter((value): value is string => Boolean(value))
  );

  const onlyUnsynced = pendingMapped.filter((review) => !knownIds.has(review.clientReviewId ?? ""));

  return [...onlyUnsynced, ...serverReviews].sort(
    (a, b) => new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime()
  );
}
