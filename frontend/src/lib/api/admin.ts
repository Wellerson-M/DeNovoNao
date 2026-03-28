import type { ReviewRecord, UserRecord } from "@/lib/types";

type AdminReviewsResponse = {
  items: Array<{
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
  }>;
  meta: {
    page: number;
    pageSize: number;
    total: number;
    hasMore: boolean;
  };
};

type AdminUsersResponse = {
  items: UserRecord[];
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

function headers(token: string) {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

async function readErrorMessage(response: Response, fallback: string) {
  const body = (await response.json().catch(() => null)) as { message?: string } | null;
  return body?.message ?? fallback;
}

function mapReview(review: AdminReviewsResponse["items"][number]): ReviewRecord {
  return {
    id: review._id,
    id_casal: review.id_casal,
    placeName: review.placeName,
    locationLabel: review.locationLabel,
    isDelivery: typeof review.isDelivery === "boolean" ? review.isDelivery : false,
    placeRating: review.placeRating,
    opinionOne: review.opinionOne,
    opinionTwo: review.opinionTwo,
    criticalWarnings: review.criticalWarnings,
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

export async function fetchAdminUsers(token: string, query = "") {
  const params = new URLSearchParams();
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`${getApiUrl()}/admin/users?${params.toString()}`, {
    cache: "no-store",
    headers: headers(token),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível carregar usuários"));
  }

  return (await response.json()) as AdminUsersResponse;
}

export async function updateAdminUser(
  userId: string,
  input: Partial<Pick<UserRecord, "name" | "login" | "email" | "role" | "id_casal" | "active">>,
  token: string
) {
  const response = await fetch(`${getApiUrl()}/admin/users/${userId}`, {
    method: "PUT",
    headers: headers(token),
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível atualizar o usuário"));
  }

  const data = (await response.json()) as { item: UserRecord };
  return data.item;
}

export async function fetchAdminReviews(token: string, page = 1, query = "", sort: "alpha" | "recent" = "alpha") {
  const params = new URLSearchParams({ page: String(page), sort });
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`${getApiUrl()}/admin/reviews?${params.toString()}`, {
    cache: "no-store",
    headers: headers(token),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível carregar avaliações"));
  }

  const data = (await response.json()) as AdminReviewsResponse;
  return {
    items: data.items.map(mapReview),
    meta: data.meta,
  };
}

export async function fetchAdminUserReviews(token: string, userId: string, page = 1, query = "") {
  const params = new URLSearchParams({ page: String(page) });
  if (query.trim()) {
    params.set("q", query.trim());
  }

  const response = await fetch(`${getApiUrl()}/admin/users/${userId}/reviews?${params.toString()}`, {
    cache: "no-store",
    headers: headers(token),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível carregar as avaliações do usuário"));
  }

  const data = (await response.json()) as AdminReviewsResponse;
  return {
    items: data.items.map(mapReview),
    meta: data.meta,
  };
}

export async function deleteAdminUser(token: string, userId: string) {
  const response = await fetch(`${getApiUrl()}/admin/users/${userId}`, {
    method: "DELETE",
    headers: headers(token),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, "Não foi possível excluir o usuário"));
  }

  return (await response.json()) as { message: string; item: { id: string } };
}

