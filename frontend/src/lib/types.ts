export type AuthRole = 0 | 1 | 2;

export type AuthSession = {
  token: string;
  userId: string;
  role: AuthRole;
  id_casal: string | null;
  email?: string;
};

export type SyncStatus = "pending" | "syncing" | "failed";

export type ReviewInput = {
  placeName: string;
  locationLabel: string;
  placeRating: number;
  opinionOne: string;
  opinionTwo: string;
  criticalWarnings: string[];
  isPublic: boolean;
};

export type ReviewRecord = ReviewInput & {
  id: string;
  id_casal: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus?: SyncStatus;
  localOnly?: boolean;
};

export type ReviewsMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasMore: boolean;
  averagePlaceRating: number | null;
};

export type ReviewsResponse = {
  items: ReviewRecord[];
  meta: ReviewsMeta;
};
