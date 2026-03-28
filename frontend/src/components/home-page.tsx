"use client";
/* cSpell:disable */

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  LogOut,
  MapPin,
  MoonStar,
  Plus,
  RefreshCcw,
  Search,
  Shield,
  Star,
  SunMedium,
  Trash2,
  Wifi,
  WifiOff,
} from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { useAuth } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";
import { useReviews } from "@/hooks/use-reviews";
import { useUi } from "@/contexts/ui-context";
import type { ReviewInput, ReviewRecord } from "@/lib/types";

type ThemeMode = "dark" | "light";

type ReviewGroup = {
  key: string;
  placeName: string;
  locationLabel: string;
  primary: ReviewRecord;
  reviews: ReviewRecord[];
};

function getReviewSortTime(review: ReviewRecord) {
  return new Date(review.visitedAt || review.createdAt).getTime();
}

function formatVisitedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

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

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      window.localStorage.setItem("denovonao-theme", next);
      return next;
    });
  }

  return { theme, toggleTheme };
}

function canManageReview(review: ReviewRecord, session: ReturnType<typeof useAuth>["session"]) {
  if (review.localOnly) {
    return true;
  }

  if (!session) {
    return false;
  }

  if (session.role >= 2) {
    return true;
  }

  return Boolean(session.id_casal && session.id_casal === review.id_casal);
}

function SingleReview({
  review,
  canDelete,
  onDelete,
  isDeleting,
}: {
  review: ReviewRecord;
  canDelete: boolean;
  onDelete: (review: ReviewRecord) => Promise<void>;
  isDeleting: boolean;
}) {
  return (
    <article className="rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            {review.syncStatus ? (
              <span className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--danger-text)]">
                Não postado, aguardando conexão
              </span>
            ) : null}
            {!review.isPublic ? (
              <span className="rounded-full border border-[var(--field-border)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-strong)]">
                Privado
              </span>
            ) : null}
          </div>

          <Stars value={review.placeRating} />
        </div>

        {canDelete ? (
          <button
            type="button"
            onClick={() => void onDelete(review)}
            disabled={isDeleting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--field-border)] bg-[var(--panel)] text-[var(--muted-strong)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] disabled:opacity-50"
            aria-label="Excluir avaliação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--panel)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opinião 1</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.opinionOne || "Sem comentário."}</p>
        </div>

        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--panel)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opinião 2</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.opinionTwo || "Sem comentário."}</p>
        </div>
      </div>

      {review.criticalWarnings.length > 0 ? (
        <div className="mt-4 rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--danger-text)]">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.24em]">Avisos críticos</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {review.criticalWarnings.map((flag, index) => (
              <span
                key={`${flag}-${index}`}
                className="rounded-full border border-[var(--danger-border)] bg-[var(--badge-bg)] px-3 py-1 text-xs text-[var(--danger-text)]"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[var(--muted)]">
        <span>Visita em {formatVisitedDate(review.visitedAt)}</span>
        {review.isPublic && review.publisherLabel ? (
          <span>Publicado por: {review.publisherLabel}</span>
        ) : null}
      </div>
    </article>
  );
}

function ReviewGroupCard({
  group,
  expanded,
  onToggle,
  onDelete,
  deletingId,
  session,
}: {
  group: ReviewGroup;
  expanded: boolean;
  onToggle: () => void;
  onDelete: (review: ReviewRecord) => Promise<void>;
  deletingId: string | null;
  session: ReturnType<typeof useAuth>["session"];
}) {
  const hasMore = group.reviews.length > 1;

  return (
    <article className="rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{group.placeName}</h3>
            <span className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-strong)]">
              {group.reviews.length} visita{group.reviews.length > 1 ? "s" : ""}
            </span>
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{group.locationLabel}</span>
          </div>
        </div>

        {hasMore ? (
          <button
            type="button"
            onClick={onToggle}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-xs font-medium text-[var(--text-soft)]"
          >
            {expanded ? "Ocultar outras avaliações" : `Ver outras avaliações (${group.reviews.length - 1})`}
            <ChevronDown className={clsx("h-4 w-4 transition-transform", expanded && "rotate-180")} />
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        <SingleReview
          review={group.primary}
          canDelete={canManageReview(group.primary, session)}
          onDelete={onDelete}
          isDeleting={deletingId === group.primary.id}
        />

        {expanded
          ? group.reviews.slice(1).map((review) => (
              <SingleReview
                key={review.id}
                review={review}
                canDelete={canManageReview(review, session)}
                onDelete={onDelete}
                isDeleting={deletingId === review.id}
              />
            ))
          : null}
      </div>
    </article>
  );
}

export function HomePage() {
  const { isOnline } = useConnection();
  const { session, logout } = useAuth();
  const { showLoaderFor, withLoader } = useUi();
  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const { theme, toggleTheme } = useThemeMode();

  const {
    reviews,
    meta,
    isLoading,
    isLoadingMore,
    error,
    reload,
    loadMore,
    createOrQueueReview,
    deleteReview,
  } = useReviews({
    query,
    rating: ratingFilter,
    token: session?.token ?? null,
    isOnline,
  });

  const groupedReviews = useMemo<ReviewGroup[]>(() => {
    const groups = new Map<string, ReviewGroup>();

    const sorted = [...reviews].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    for (const review of sorted) {
      const key = `${review.placeName.toLowerCase()}::${review.locationLabel.toLowerCase()}`;
      const current = groups.get(key);

      if (!current) {
        groups.set(key, {
          key,
          placeName: review.placeName,
          locationLabel: review.locationLabel,
          primary: review,
          reviews: [review],
        });
        continue;
      }

      current.reviews.push(review);
    }

    return Array.from(groups.values())
      .map((group) => {
        const ordered = [...group.reviews].sort(
          (a, b) => {
            const aOwnUser = session?.userId && a.createdByUserId === session.userId ? 1 : 0;
            const bOwnUser = session?.userId && b.createdByUserId === session.userId ? 1 : 0;

            if (aOwnUser !== bOwnUser) {
              return bOwnUser - aOwnUser;
            }

            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          }
        );

        return {
          ...group,
          primary: ordered[0],
          reviews: ordered,
        };
      })
      .sort((a, b) => new Date(b.primary.createdAt).getTime() - new Date(a.primary.createdAt).getTime());
  }, [reviews, session?.userId]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await withLoader(reload(), 420);
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleDelete(review: ReviewRecord) {
    setDeletingId(review.id);
    try {
      await deleteReview(review, "soft");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(input: ReviewInput) {
    const result = await createOrQueueReview(input);
    if (result?.mode === "online") {
      setIsComposerOpen(false);
    }
    return result;
  }

  const searchTitle = query.trim();

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
                  Um histórico pessoal para lembrar o que vale repetir, o que decepcionou e o que merece atenção antes do próximo pedido.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    showLoaderFor(260);
                    toggleTheme();
                  }}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] hover:-translate-y-0.5"
                >
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  {theme === "dark" ? "Tema claro" : "Tema escuro"}
                </button>

                {session?.role === 2 ? (
                  <Link
                    href="/admin"
                    onClick={() => showLoaderFor(420)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                ) : null}

                {session ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]">
                      {session.name ?? session.email ?? "Usuário"}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        showLoaderFor(320);
                        logout();
                      }}
                      className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
                    >
                      <LogOut className="h-4 w-4" />
                      Sair
                    </button>
                  </div>
                ) : (
                  <Link
                    href="/login"
                    onClick={() => showLoaderFor(420)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
                  >
                    <LogOut className="h-4 w-4" />
                    Entrar
                  </Link>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex w-full items-center gap-3 rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 lg:max-w-xl">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar por nome ou local"
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
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] hover:-translate-y-0.5"
                >
                  <RefreshCcw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Filtrar por nota</span>
              <div className="-mx-1 overflow-x-auto pb-1">
                <div className="flex min-w-max items-center gap-2 px-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRatingFilter((current) => (current === value ? null : value))}
                      className={clsx(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-2 text-xs font-medium transition",
                        ratingFilter === value
                          ? "border-[var(--accent-soft)] bg-[var(--accent-glass)] text-[var(--text)]"
                          : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)]"
                      )}
                    >
                      <Star className={clsx("h-3.5 w-3.5", ratingFilter === value && "fill-current")} />
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {searchTitle ? (
          <section className="rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] px-5 py-5 shadow-[var(--panel-shadow)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Resultado da busca</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{searchTitle}</h2>
              <div className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]">
                Média geral pública: {" "}
                <span className="font-semibold text-[var(--text)]">
                  {meta.averagePlaceRating !== null ? meta.averagePlaceRating.toFixed(1) : "Sem média ainda"}
                </span>
              </div>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[30px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-[var(--panel-hover)]"
            aria-expanded={isComposerOpen}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-soft)]/25 bg-[var(--accent-glass)] text-[var(--accent-contrast)] shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Adicionar avaliação</p>
                <p className="text-xs text-[var(--muted-strong)]">
                  Cada novo envio entra como uma nova visita na linha do tempo do mesmo restaurante.
                </p>
              </div>
            </div>

            <ChevronDown
              className={clsx("h-5 w-5 text-[var(--muted)] transition-transform duration-200", isComposerOpen && "rotate-180")}
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
                <ReviewForm onSubmit={handleSubmit} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Últimas avaliações</h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {meta.total || reviews.length} registro(s) visíveis para este usuário
            </p>
          </div>
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

        <div className="grid gap-4">
          {groupedReviews.map((group) => (
            <ReviewGroupCard
              key={group.key}
              group={group}
              expanded={Boolean(expandedGroups[group.key])}
              onToggle={() =>
                setExpandedGroups((current) => ({
                  ...current,
                  [group.key]: !current[group.key],
                }))
              }
              onDelete={handleDelete}
              deletingId={deletingId}
              session={session}
            />
          ))}
        </div>

        {meta.hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-medium text-[var(--text-soft)] hover:-translate-y-0.5"
          >
            {isLoadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            Carregar mais
          </button>
        ) : null}

        {!isLoading && groupedReviews.length === 0 ? (
          <section className="rounded-[28px] border border-dashed border-[var(--panel-border)] bg-[var(--panel)] px-5 py-10 text-center shadow-[var(--panel-shadow)]">
            <p className="text-lg font-medium text-[var(--text)]">Nenhuma avaliação ainda.</p>
            <p className="mt-2 text-sm text-[var(--muted-strong)]">
              Comece registrando uma visita para preencher o seu histórico gastronômico.
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
