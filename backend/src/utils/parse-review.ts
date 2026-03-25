type InputReview = {
  placeName?: unknown;
  locationLabel?: unknown;
  coupleRating?: unknown;
  myOpinion?: unknown;
  herOpinion?: unknown;
  redFlags?: unknown;
  visitedAt?: unknown;
  syncMeta?: {
    source?: unknown;
    clientReviewId?: unknown;
    lastSyncedAt?: unknown;
  };
};

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function parseReviewPayload(input: InputReview) {
  const placeName = asString(input.placeName);
  const locationLabel = asString(input.locationLabel);
  const myOpinion = asString(input.myOpinion);
  const herOpinion = asString(input.herOpinion);
  const clientReviewId = asString(input.syncMeta?.clientReviewId);
  const source = asString(input.syncMeta?.source) || "mobile-pwa";
  const rating = Number(input.coupleRating);
  const visitedAt = input.visitedAt ? new Date(String(input.visitedAt)) : new Date();

  const redFlags = Array.isArray(input.redFlags)
    ? input.redFlags.map((value) => asString(value)).filter(Boolean)
    : [];

  if (!placeName) throw new Error("placeName is required");
  if (!locationLabel) throw new Error("locationLabel is required");
  if (!clientReviewId) throw new Error("syncMeta.clientReviewId is required");
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) throw new Error("coupleRating must be between 1 and 5");
  if (Number.isNaN(visitedAt.getTime())) throw new Error("visitedAt is invalid");

  return {
    placeName,
    locationLabel,
    coupleRating: rating,
    myOpinion,
    herOpinion,
    redFlags,
    tags: [],
    visitedAt,
    syncMeta: {
      source,
      clientReviewId,
      lastSyncedAt: new Date(),
    },
  };
}
