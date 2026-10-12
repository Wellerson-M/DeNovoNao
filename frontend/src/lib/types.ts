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

/** Foto guardada no Cloudinary; o banco só tem o endereço. */
export type ReviewPhoto = {
  publicId: string;
  url: string;
  width: number | null;
  height: number | null;
};

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
  /** Fotos já enviadas ao Cloudinary. Opcional: a foto é um extra, não o foco. */
  photos?: ReviewPhoto[];
};

export type ReviewRecord = ReviewInput & {
  id: string;
  photos: ReviewPhoto[];
  /** Fotos de uma avaliação offline que ainda vão subir junto com ela. */
  pendingPhotoCount?: number;
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

