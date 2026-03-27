export type AuthRole = 0 | 1 | 2;

export type AuthSession = {
  token: string;
  userId: string;
  role: AuthRole;
  id_casal: string | null;
  name?: string;
  email?: string;
};

export type UserRecord = {
  id: string;
  name: string;
  email: string;
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
  placeRating: number;
  opinionOne: string;
  opinionTwo: string;
  criticalWarnings: string[];
  visitedAt: string;
  isPublic: boolean;
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

export type AuthResponse = {
  token: string;
  user: UserRecord;
};
