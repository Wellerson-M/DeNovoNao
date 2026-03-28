import type { ReviewInput, ReviewRecord, ReviewsResponse } from "@/lib/types";

type ServerReview = {
  _id: string;
  id_casal: string;
  placeName: string;
  locationLabel: string;
  isDelivery?: boolean;
  placeRating: number;
  opinionOne: string;
  opinionTwo: string;
  criticalWarnings: string[];
  visitedAt: string;
  isPublic: boolean;
  active: boolean;
  createdByUserId?: string | null;
  createdByName?: string | null;
  publisherLabel?: string | null;
  createdAt: string;
  updatedAt: string;
};

type ServerReviewsResponse = {
  items: ServerReview[];
  meta: ReviewsResponse["meta"];
};

function getApiUrl() {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== "undefined") {
    return `${window.location.protocol}//${window.location.hostname}:4000/api`;
  }

  return "http://localhost:4000/api";
}

function authHeaders(token?: string | null): Record<string, string> {
  if (!token) {
    return {};
  }

  return {
    Authorization: `Bearer ${token}`,
  };
}

function mapReview(review: ServerReview): ReviewRecord {
  return {
    id: review._id,
    id_casal: review.id_casal,
    placeName: review.placeName,
    locationLabel: review.locationLabel,
    isDelivery: typeof review.isDelivery === "boolean" ? review.isDelivery : false,
    placeRating: review.placeRating,
    opinionOne: review.opinionOne,
    opinionTwo: review.opinionTwo,
    criticalWarnings: Array.isArray(review.criticalWarnings) ? review.criticalWarnings : [],
    visitedAt: review.visitedAt,
    isPublic: review.isPublic,
    active: review.active,
    createdByUserId: typeof review.createdByUserId === "string" ? review.createdByUserId : null,
    createdByName: typeof review.createdByName === "string" ? review.createdByName : null,
    publisherLabel: typeof review.publisherLabel === "string" ? review.publisherLabel : null,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export async function fetchReviews(params: {
  query?: string;
  page?: number;
  rating?: number | null;
  token?: string | null;
}) {
  const searchParams = new URLSearchParams();

  if (params.query?.trim()) {
    searchParams.set("q", params.query.trim());
  }

  if (params.rating && params.rating >= 1 && params.rating <= 5) {
    searchParams.set("rating", String(params.rating));
  }

  searchParams.set("page", String(params.page ?? 1));

  const response = await fetch(`${getApiUrl()}/reviews?${searchParams.toString()}`, {
    cache: "no-store",
    headers: {
      ...authHeaders(params.token),
    },
  });

  if (!response.ok) {
    throw new Error("Não foi possível carregar as avaliações");
  }

  const data = (await response.json()) as ServerReviewsResponse;

  return {
    items: Array.isArray(data.items) ? data.items.map(mapReview) : [],
    meta: data.meta,
  } satisfies ReviewsResponse;
}

export async function createReview(input: ReviewInput, token: string) {
  const response = await fetch(`${getApiUrl()}/reviews`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível criar a avaliação");
  }

  const data = (await response.json()) as { item: ServerReview };
  return mapReview(data.item);
}

export async function updateReview(reviewId: string, input: Partial<ReviewInput>, token: string) {
  const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível editar a avaliação");
  }

  const data = (await response.json()) as { item: ServerReview };
  return mapReview(data.item);
}

export async function removeReview(reviewId: string, token: string, mode: "soft" | "hard" = "soft") {
  const response = await fetch(`${getApiUrl()}/reviews/${reviewId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(token),
    },
    body: JSON.stringify({ mode }),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(body?.message ?? "Não foi possível excluir a avaliação");
  }

  const data = (await response.json()) as { item: ServerReview };
  return mapReview(data.item);
}
