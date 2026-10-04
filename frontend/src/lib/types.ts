export type AuthRole = 0 | 1 | 2;

export type AuthSession = {
  token: string;
  userId: string;
  role: AuthRole;
  id_casal: string | null;
  name?: string;
  login?: string;
  email?: string;
};

export type UserRecord = {
  id: string;
  name: string;
  login: string | null;
  email: string | null;
  role: AuthRole;
  id_casal: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SyncStatus = "pending" | "syncing" | "failed";

export type ReviewInput = {
  placeName: string;
  locationLabel: string;
  isDelivery: boolean;
  placeRating: number;
  opinionOne: string;
  opinionTwo: string;
  criticalWarnings: string[];
  visitedAt: string;
  isPublic: boolean;
  /** Valor gasto por pessoa, em reais. Opcional. */
  priceAmount: number | null;
  /** Texto livre sobre os valores, ex.: "X-burguer 32, chopp 18". */
  priceNote: string;
};

export type ReviewRecord = ReviewInput & {
  id: string;
  id_casal: string;
  active: boolean;
  createdByUserId?: string | null;
  createdByName?: string | null;
  publisherLabel?: string | null;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
  localOnly?: boolean;
};

export type PriceRange = { min: number; max: number; count: number };

export type ReviewsMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  averagePlaceRating: number | null;
  /** Faixa de valores por lugar (chave em minúsculas). */
  priceRanges?: Record<string, PriceRange>;
};

export type ReviewsResponse = {
  items: ReviewRecord[];
  meta: ReviewsMeta;
};

export type AuthResponse = {
  token: string;
  user: UserRecord;
};

