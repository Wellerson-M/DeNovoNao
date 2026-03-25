"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createReview, fetchReviews, removeReview } from "@/lib/api/reviews";
import { generateClientId } from "@/lib/client-id";
import { db, deleteLocalReview } from "@/lib/offline/db";
import { mergeReviews } from "@/lib/offline/merge-reviews";
import { saveReviewOffline, subscribeSync, syncPendingReviews } from "@/lib/offline/sync";
import { ReviewInput, ReviewRecord } from "@/lib/types";

export function useReviews(search: string, isOnline: boolean) {
  const [remoteReviews, setRemoteReviews] = useState<ReviewRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const localReviews = useLiveQuery(
    () => db.reviews.where("status").anyOf("pending", "syncing", "failed").toArray(),
    [],
    []
  );

  const loadReviews = useCallback(async () => {
    if (!isOnline) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await fetchReviews(search);
      setRemoteReviews(data);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erro ao carregar avaliacoes");
    } finally {
      setIsLoading(false);
    }
  }, [isOnline, search]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  useEffect(() => {
    const unsubscribe = subscribeSync(async () => {
      await loadReviews();
    });

    return unsubscribe;
  }, [loadReviews]);

  const createOrQueueReview = useCallback(
    async (input: ReviewInput) => {
      const clientReviewId = generateClientId();

      if (isOnline) {
        try {
          await createReview(input, clientReviewId);
          await loadReviews();
          return { mode: "online" as const };
        } catch (error) {
          console.warn("Falling back to offline queue", error);
        }
      }

      await saveReviewOffline({
        ...input,
        clientReviewId,
      });

      return { mode: "offline" as const };
    },
    [isOnline, loadReviews]
  );

  const deleteReview = useCallback(
    async (review: ReviewRecord) => {
      if (review.syncStatus && review.clientReviewId) {
        await deleteLocalReview(review.clientReviewId);
        return loadReviews();
      }

      await removeReview(review.id);
      return loadReviews();
    },
    [loadReviews]
  );

  useEffect(() => {
    if (!isOnline) {
      return;
    }

    void syncPendingReviews().then(() => loadReviews());
  }, [isOnline, loadReviews]);

  const reviews = useMemo(
    () => mergeReviews(remoteReviews, localReviews ?? []),
    [localReviews, remoteReviews]
  );

  return {
    reviews,
    isLoading,
    error,
    reload: loadReviews,
    createOrQueueReview,
    deleteReview,
  };
}
