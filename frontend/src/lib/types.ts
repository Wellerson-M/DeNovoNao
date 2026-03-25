export type SyncStatus = "pending" | "syncing" | "failed";

export type ReviewInput = {
  placeName: string;
  locationLabel: string;
  coupleRating: number;
  myOpinion: string;
  herOpinion: string;
  redFlags: string[];
  visitedAt: string;
};

export type ReviewRecord = ReviewInput & {
  id: string;
  createdAt: string;
  updatedAt?: string;
  syncStatus?: SyncStatus;
  clientReviewId?: string;
};
