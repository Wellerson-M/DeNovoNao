"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  MapPin,
  MoonStar,
  Plus,
  RefreshCcw,
  Search,
  Star,
  SunMedium,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import clsx from "clsx";
import { ReviewForm } from "@/components/review-form";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useReviews } from "@/hooks/use-reviews";
import { type ReviewRecord } from "@/lib/types";

type ThemeMode = "dark" | "light";

const INITIAL_VISIBLE = 4;

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-[var(--star)]">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={clsx("h-4 w-4", index < value ? "fill-current" : "")} />
      ))}
    </div>
  );
}

function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("denovonao-theme");
    const initialTheme = storedTheme === "light" ? "light" : "dark";
    setTheme(initialTheme);
    document.documentElement.dataset.theme = initialTheme;
  }, []);

  const toggleTheme = () => {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem("denovonao-theme", next);
      return next;
    });
  };

  return { theme, toggleTheme };
}

function ReviewCard({
  review,
  onDelete,
  isDeleting,
}: {
  review: ReviewRecord;
  onDelete: (review: ReviewRecord) => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <article className="rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{review.placeName}</h3>
            {review.syncStatus ? (
              <span className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--danger-text)]">
                {review.syncStatus === "failed" ? "Falha ao sincronizar" : "Aguardando sincronização"}
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{review.locationLabel}</span>
          </div>

          <Stars value={review.coupleRating} />
        </div>

        <button
          type="button"
          onClick={() => void onDelete(review)}
          disabled={isDeleting}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] focus:outline-none focus:shadow-[0_0_0_4px_var(--accent-ring)] disabled:opacity-50"
          aria-label="Excluir avaliação"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opinião 1</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.myOpinion || "Sem comentário."}</p>
        </div>

        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opinião 2</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.herOpinion || "Sem comentário."}</p>
        </div>
      </div>

      {review.redFlags.length > 0 ? (
        <div className="mt-4 rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--danger-text)]">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.24em]">Não repetir</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {review.redFlags.map((flag) => (
              <span
                key={flag}
                className="rounded-full border border-[var(--danger-border)] bg-[var(--badge-bg)] px-3 py-1 text-xs text-[var(--danger-text)]"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex items-center justify-between text-xs text-[var(--muted)]">
        <span>
          {new Intl.DateTimeFormat("pt-BR", {
            dateStyle: "medium",
          }).format(new Date(review.visitedAt))}
        </span>
      </div>
    </article>
  );
}

export function HomePage() {
  const isOnline = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const { theme, toggleTheme } = useThemeMode();
  const { reviews, isLoading, error, reload, createOrQueueReview, deleteReview } = useReviews(query, isOnline);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE);
  }, [query, reviews.length]);

  const visibleReviews = useMemo(() => reviews.slice(0, visibleCount), [reviews, visibleCount]);
  const hasMore = reviews.length > visibleCount;

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await reload();
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDelete(review: ReviewRecord) {
    setDeletingId(review.id);
    try {
      await deleteReview(review);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[32px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-5 shadow-[var(--hero-shadow)] backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">DeNovoNao</p>
                <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
                  Registre avaliações e não repita erros gastronômicos.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)] sm:text-base">
                  Um histórico pessoal para lembrar o que vale repetir, o que decepcionou e quais red flags merecem atenção antes do próximo pedido.
                </p>
              </div>

              <button
                type="button"
                onClick={toggleTheme}
                className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] shadow-sm hover:-translate-y-0.5 hover:border-[var(--accent-soft)] focus:outline-none focus:shadow-[0_0_0_4px_var(--accent-ring)]"
              >
                {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                {theme === "dark" ? "Tema claro" : "Tema escuro"}
              </button>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex w-full items-center gap-3 rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 lg:max-w-xl">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar local, bairro ou red flag"
                  className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
              </label>

              <div className="flex flex-wrap items-center gap-3">
                <div
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-full border px-3.5 py-2 text-xs font-medium",
                    isOnline
                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                      : "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
                  )}
                >
                  {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  {isOnline ? "Online" : "Offline"}
                </div>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] hover:-translate-y-0.5 hover:border-[var(--accent-soft)] focus:outline-none focus:shadow-[0_0_0_4px_var(--accent-ring)]"
                >
                  <RefreshCcw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[30px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--panel-hover)] focus:outline-none focus:shadow-[inset_0_0_0_1px_var(--accent-ring)]"
            aria-expanded={isComposerOpen}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-soft)]/25 bg-[var(--accent-glass)] text-[var(--accent-contrast)] shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Adicionar avaliação</p>
                <p className="text-xs text-[var(--muted-strong)]">
                  Abra o formulário para registrar o que vale — ou não vale — repetir.
                </p>
              </div>
            </div>

            <ChevronDown
              className={clsx(
                "h-5 w-5 text-[var(--muted)] transition-transform duration-200",
                isComposerOpen && "rotate-180"
              )}
            />
          </button>

          <div
            className={clsx(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              isComposerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-80"
            )}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[var(--panel-border)] px-4 pb-4 pt-4 sm:px-5">
                <ReviewForm onSubmit={createOrQueueReview} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Últimas avaliações</h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {reviews.length} registro(s) encontrados
            </p>
          </div>

          {reviews.length > INITIAL_VISIBLE ? (
            <button
              type="button"
              onClick={() => setVisibleCount(hasMore ? reviews.length : INITIAL_VISIBLE)}
              className="inline-flex items-center gap-2 self-start rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] hover:-translate-y-0.5 hover:border-[var(--accent-soft)] focus:outline-none focus:shadow-[0_0_0_4px_var(--accent-ring)]"
            >
              {hasMore ? "Ver todos" : "Ver menos"}
              <ChevronRight className={clsx("h-4 w-4 transition-transform", !hasMore && "rotate-90")} />
            </button>
          ) : null}
        </section>

        {error ? (
          <div className="rounded-[24px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-8 text-center text-sm text-[var(--muted-strong)] shadow-[var(--panel-shadow)]">
            Carregando avaliações...
          </div>
        ) : null}

        <div className="grid gap-4 xl:grid-cols-2">
          {visibleReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onDelete={handleDelete}
              isDeleting={deletingId === review.id}
            />
          ))}
        </div>

        {!isLoading && reviews.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-[var(--panel-border)] bg-[var(--panel)] px-5 py-10 text-center shadow-[var(--panel-shadow)]">
            <p className="text-lg font-medium text-[var(--text)]">Nenhuma avaliação ainda.</p>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Comece registrando um lugar para montar seu histórico do que repetir — e do que evitar.
            </p>
          </section>
        ) : null}

      </div>
    </main>
  );
}
