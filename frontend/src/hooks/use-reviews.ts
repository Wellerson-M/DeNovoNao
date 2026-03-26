"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createReview, fetchReviews, removeReview, updateReview } from "@/lib/api/reviews";
import { generateClientId } from "@/lib/client-id";
import { db, deleteQueuedReview } from "@/lib/offline/db";
import { mergeReviews } from "@/lib/offline/merge-reviews";
import { saveReviewOffline, subscribeSync, syncPendingReviews } from "@/lib/offline/sync";
import type { ReviewInput, ReviewRecord, ReviewsMeta } from "@/lib/types";

const EMPTY_META: ReviewsMeta = {
  page: 1,
  pageSize: 10,
  total: 0,
  hasMore: false,
  averagePlaceRating: null,
};

export function useReviews(params: {
  query: string;
  token: string | null;
  isOnline: boolean;
}) {
  const { isOnline, query, token } = params;
  const [remoteReviews, setRemoteReviews] = useState<ReviewRecord[]>([]);
  const [meta, setMeta] = useState<ReviewsMeta>(EMPTY_META);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localReviews = useLiveQuery(
    () => db.queuedReviews.where("status").anyOf("pending", "syncing", "failed").toArray(),
    [],
    []
  );

  const loadPage = useCallback(
    async (page: number, mode: "replace" | "append") => {
      try {
        if (mode === "replace") {
          setIsLoading(true);
        } else {
          setIsLoadingMore(true);
        }

        const response = await fetchReviews({
          query,
          page,
          token,
        });

        setMeta(response.meta ?? EMPTY_META);
        setCurrentPage(page);
        setError(null);

        setRemoteReviews((current) => {
          if (mode === "replace") {
            return response.items;
          }

          const seen = new Set(current.map((item) => item.id));
          const nextItems = response.items.filter((item) => !seen.has(item.id));
          return [...current, ...nextItems];
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Erro ao carregar avaliações");
        if (mode === "replace") {
          setRemoteReviews([]);
          setMeta(EMPTY_META);
        }
      } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
      }
    },
    [query, token]
  );

  const reload = useCallback(async () => {
    await loadPage(1, "replace");
  }, [loadPage]);

  const loadMore = useCallback(async () => {
    if (!meta.hasMore || isLoadingMore) {
      return;
    }

    await loadPage(currentPage + 1, "append");
  }, [currentPage, isLoadingMore, loadPage, meta.hasMore]);

  useEffect(() => {
    void loadPage(1, "replace");
  }, [loadPage]);

  useEffect(() => {
    const unsubscribe = subscribeSync(async () => {
      await reload();
    });

    return unsubscribe;
  }, [reload]);

  useEffect(() => {
    if (isOnline) {
      void syncPendingReviews(token).then(() => reload());
    }
  }, [isOnline, reload, token]);

  const createOrQueueReview = useCallback(
    async (input: ReviewInput) => {
      if (!token) {
        throw new Error("Faça login para publicar avaliações");
      }

      if (isOnline) {
        try {
          await createReview(input, token);
          await reload();
          return { mode: "online" as const };
        } catch (error) {
          console.warn("Falling back to offline queue", error);
        }
      }

      const localId = generateClientId();
      await saveReviewOffline({
        ...input,
        localId,
      });

      return { mode: "offline" as const };
    },
    [isOnline, reload, token]
  );

  const editReview = useCallback(
    async (reviewId: string, input: Partial<ReviewInput>) => {
      if (!token) {
        throw new Error("Faça login para editar avaliações");
      }

      await updateReview(reviewId, input, token);
      await reload();
    },
    [reload, token]
  );

  const deleteReview = useCallback(
    async (review: ReviewRecord, mode: "soft" | "hard" = "soft") => {
      if (review.localOnly) {
        await deleteQueuedReview(review.id);
        return reload();
      }

      if (!token) {
        throw new Error("Faça login para excluir avaliações");
      }

      await removeReview(review.id, token, mode);
      await reload();
    },
    [reload, token]
  );

  const reviews = useMemo(
    () => mergeReviews(remoteReviews, localReviews ?? []),
    [localReviews, remoteReviews]
  );

  return {
    reviews,
    meta,
    isLoading,
    isLoadingMore,
    error,
    reload,
    loadMore,
    createOrQueueReview,
    editReview,
    deleteReview,
  };
}

