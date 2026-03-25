import Dexie, { type Table } from "dexie";
import { type ReviewInput, type SyncStatus } from "@/lib/types";

export type LocalReview = ReviewInput & {
  clientReviewId: string;
  createdAt: string;
  status: SyncStatus;
};

class AvalieitorDB extends Dexie {
  reviews!: Table<LocalReview, string>;

  constructor() {
    super("avalieitor");

    this.version(1).stores({
      reviews: "clientReviewId, placeName, locationLabel, status, visitedAt, createdAt",
    });
  }
}

export const db = new AvalieitorDB();
