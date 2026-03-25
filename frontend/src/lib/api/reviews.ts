import { ReviewInput, ReviewRecord } from "@/lib/types";

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }

  return "http://localhost:4000/api";
}

type ServerReview = {
  _id: string;
  placeName: string;
  locationLabel: string;
  coupleRating: number;
  myOpinion: string;
  herOpinion: string;
  redFlags: string[];
  visitedAt: string;
  createdAt: string;
  updatedAt: string;
  syncMeta?: {
    clientReviewId?: string;
  };
};

type ReviewsListResponse = {
  storage: string;
  items: ServerReview[];
};

type ReviewWriteResponse = {
  storage: string;
  item: ServerReview;
};

function fromServer(review: ServerReview): ReviewRecord {
  return {
    id: String(review._id),
    placeName: review.placeName,
    locationLabel: review.locationLabel,
    coupleRating: review.coupleRating,
    myOpinion: review.myOpinion,
    herOpinion: review.herOpinion,
    redFlags: Array.isArray(review.redFlags) ? review.redFlags : [],
    visitedAt: review.visitedAt,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
    clientReviewId: review.syncMeta?.clientReviewId,
  };
}

export async function fetchReviews(query = "") {
  const params = new URLSearchParams();

  if (query.trim()) {
    params.set("q", query.trim());
  }

  const suffix = params.toString();
  const response = await fetch(`${getApiUrl()}/reviews${suffix ? `?${suffix}` : ""}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Could not load reviews");
  }

  const data = (await response.json()) as ReviewsListResponse;
  return Array.isArray(data.items) ? data.items.map(fromServer) : [];
}

export async function createReview(input: ReviewInput, clientReviewId: string) {
  const response = await fetch(`${getApiUrl()}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...input,
      syncMeta: {
        source: "mobile-pwa",
        clientReviewId,
        lastSyncedAt: new Date().toISOString(),
      },
    }),
  });

  if (!response.ok) {
    throw new Error("Could not create review");
  }

  const data = (await response.json()) as ReviewWriteResponse;
  return fromServer(data.item);
}

export async function removeReview(reviewId: string) {
  const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("Could not delete review");
  }

  const data = (await response.json()) as ReviewWriteResponse;
  return fromServer(data.item);
}
