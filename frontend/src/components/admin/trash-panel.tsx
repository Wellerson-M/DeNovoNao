"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { Bike, CalendarDays, Eye, EyeOff, LoaderCircle, MapPin, RotateCcw, Star, Trash2 } from "lucide-react";
import { deleteTrashedReview, fetchTrash, purgeOldData } from "@/lib/api/admin";
import { restoreReview } from "@/lib/api/reviews";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Chip, EmptyState, FilterRow, LoadingRows, SearchField } from "@/components/admin/ui";
import type { ReviewRecord } from "@/lib/types";

const VISIBILITY_FILTERS = [
  { value: "all", label: "Todas" },
  { value: "public", label: "Públicas" },
  { value: "private", label: "Privadas" },
] as const;

const PURGE_PERIODS = [
  { value: 7, label: "7 dias" },
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 365, label: "1 ano" },
] as const;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function TrashCard({
  review,
  busy,
  onRestore,
  onDelete,
}: {
  review: ReviewRecord;
  busy: boolean;
  onRestore: (review: ReviewRecord) => void;
  onDelete: (review: ReviewRecord) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const opinions = [review.opinionOne, review.opinionTwo].map((text) => text?.trim()).filter(Boolean) as string[];

  return (
    <article className="grid gap-3 rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel)] p-4">
      <div className="grid gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-base font-bold">{review.placeName}</h3>
          {review.isPublic ? (
            <Chip>
              <Eye className="h-3 w-3" />
              Pública
            </Chip>
          ) : (
            <Chip tone="warning">
              <EyeOff className="h-3 w-3" />
              Privada
            </Chip>
          )}
        </div>

        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[var(--muted-strong)]">
          <span className="flex items-center gap-1">
            {review.isDelivery ? <Bike className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
            {review.isDelivery ? "Delivery" : review.locationLabel}
          </span>
          <span className="flex items-center gap-1 font-semibold text-[var(--star)]">
            <Star className="h-3.5 w-3.5 fill-current" />
            {review.placeRating}
          </span>
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDate(review.visitedAt)}
          </span>
          {review.publisherLabel ? <span>por {review.publisherLabel}</span> : null}
        </p>
      </div>

      {opinions.length > 0 ? (
        <p className="line-clamp-3 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-soft)]">{opinions.join("\n")}</p>
      ) : null}

      {confirming ? (
        <div className="animate-fade-up grid gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
          <p className="text-sm text-[var(--danger-text)]">
            Apagar <strong>{review.placeName}</strong> para sempre? Não dá para desfazer.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onDelete(review);
                setConfirming(false);
              }}
              className="btn-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70"
            >
              Apagar
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onRestore(review)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--success-text)] disabled:opacity-70"
          >
            {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
            Restaurar
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setConfirming(true)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-text)] disabled:opacity-70"
          >
            <Trash2 className="h-4 w-4" />
            Apagar
          </button>
        </div>
      )}
    </article>
  );
}

export function TrashPanel({
  token,
  notify,
  onChanged,
}: {
  token: string;
  notify: (tone: "success" | "error", text: string) => void;
  onChanged: () => void;
}) {
  const [items, setItems] = useState<ReviewRecord[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [visibility, setVisibility] = useState<string>("all");
  const [purgeDays, setPurgeDays] = useState<number | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const debouncedQuery = useDebouncedValue(query.trim());

  const load = useCallback(
    async (nextPage = 1, mode: "replace" | "append" = "replace") => {
      setIsLoading(true);
      try {
        const response = await fetchTrash(token, nextPage, debouncedQuery, visibility as "all" | "public" | "private");
        setPage(nextPage);
        setHasMore(response.meta.hasMore);
        setTotal(response.meta.total);
        setItems((current) => (mode === "append" ? [...current, ...response.items] : response.items));
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "Não foi possível carregar a lixeira");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, debouncedQuery, visibility]
  );

  useEffect(() => {
    void load(1, "replace");
  }, [load]);

  async function handleRestore(review: ReviewRecord) {
    setBusyId(review.id);
    try {
      await restoreReview(review.id, token);
      notify("success", `${review.placeName} voltou para o feed.`);
      await load(1, "replace");
      onChanged();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível restaurar");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(review: ReviewRecord) {
    setBusyId(review.id);
    try {
      await deleteTrashedReview(token, review.id);
      notify("success", `${review.placeName} foi apagada de vez.`);
      await load(1, "replace");
      onChanged();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível apagar");
    } finally {
      setBusyId(null);
    }
  }

  async function handlePurge() {
    if (!purgeDays) {
      return;
    }

    setIsPurging(true);
    try {
      const before = new Date(Date.now() - purgeDays * 24 * 60 * 60 * 1000).toISOString();
      const { removed } = await purgeOldData(token, "trash", before);
      notify("success", removed ? `${removed} ${removed === 1 ? "avaliação apagada" : "avaliações apagadas"} de vez.` : "Nada para limpar nesse período.");
      setPurgeDays(null);
      await load(1, "replace");
      onChanged();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível limpar");
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <div className="grid gap-4">
      <SearchField value={query} onChange={setQuery} placeholder="Buscar na lixeira por local ou autor" />
      <FilterRow options={VISIBILITY_FILTERS} value={visibility} onChange={setVisibility} label="Filtrar por visibilidade" />

      <section className="grid gap-3 rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <div>
          <h2 className="text-sm font-bold">Limpar de uma vez</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-strong)]">
            Apaga para sempre tudo que está na lixeira há mais tempo que o período escolhido.
          </p>
        </div>

        <FilterRow
          options={PURGE_PERIODS.map((item) => ({ value: String(item.value), label: `+ de ${item.label}` }))}
          value={purgeDays ? String(purgeDays) : ""}
          onChange={(value) => setPurgeDays(Number(value))}
          label="Período da limpeza"
        />

        {purgeDays ? (
          <div className="animate-fade-up grid gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
            <p className="text-sm text-[var(--danger-text)]">
              Apagar de vez tudo que está na lixeira há mais de{" "}
              <strong>{PURGE_PERIODS.find((item) => item.value === purgeDays)?.label}</strong>? Não dá para desfazer.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPurgeDays(null)}
                className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPurging}
                onClick={() => void handlePurge()}
                className="btn-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70"
              >
                {isPurging ? "Limpando..." : "Limpar agora"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <p className="px-1 text-xs text-[var(--muted)]">
        {total} {total === 1 ? "avaliação na lixeira" : "avaliações na lixeira"}
      </p>

      {isLoading && items.length === 0 ? <LoadingRows /> : null}
      {!isLoading && items.length === 0 ? <EmptyState>A lixeira está vazia.</EmptyState> : null}

      {items.map((review) => (
        <TrashCard
          key={review.id}
          review={review}
          busy={busyId === review.id}
          onRestore={handleRestore}
          onDelete={handleDelete}
        />
      ))}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void load(page + 1, "append")}
          disabled={isLoading}
          className={clsx(
            "mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)]",
            isLoading && "opacity-70"
          )}
        >
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Carregar mais
        </button>
      ) : null}
    </div>
  );
}
