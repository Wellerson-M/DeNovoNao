import Dexie, { type Table } from "dexie";
import type { ReviewInput, SyncStatus } from "@/lib/types";

export type LocalQueuedReview = ReviewInput & {
  localId: string;
  createdAt: string;
  status: SyncStatus;
};

class DeNovoNaoDB extends Dexie {
  queuedReviews!: Table<LocalQueuedReview, string>;

  constructor() {
    super("denovonao");

    this.version(1).stores({
      queuedReviews: "localId, placeName, locationLabel, status, createdAt",
    });
  }
}

export const db = new DeNovoNaoDB();

export async function deleteQueuedReview(localId: string) {
  await db.queuedReviews.delete(localId);
}
