"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Edit3,
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
import type { ReviewInput, ReviewRecord } from "@/lib/types";

type ThemeMode = "dark" | "light";

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

function ReviewCard({
  review,
  onDelete,
  onEdit,
  isDeleting,
}: {
  review: ReviewRecord;
  onDelete: (review: ReviewRecord) => Promise<void>;
  onEdit: (review: ReviewRecord) => void;
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
                Não postado, aguardando conexão
              </span>
            ) : null}
            {!review.isPublic ? (
              <span className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-strong)]">
                Privado
              </span>
            ) : null}
          </div>

          <div className="flex items-center gap-2 text-sm text-[var(--muted-strong)]">
            <MapPin className="h-4 w-4" />
            <span className="truncate">{review.locationLabel}</span>
          </div>

          <Stars value={review.placeRating} />
        </div>

        <div className="flex items-center gap-2">
          {!review.localOnly ? (
            <button
              type="button"
              onClick={() => onEdit(review)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)] hover:border-[var(--accent-soft)] hover:text-[var(--text)]"
              aria-label="Editar avaliação"
            >
              <Edit3 className="h-4 w-4" />
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => void onDelete(review)}
            disabled={isDeleting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] disabled:opacity-50"
            aria-label="Excluir avaliação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opinião 1</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.opinionOne || "Sem comentário."}</p>
        </div>

        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
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
            {review.criticalWarnings.map((flag) => (
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

      <div className="mt-4 text-xs text-[var(--muted)]">
        {new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeStyle: "short" }).format(
          new Date(review.createdAt)
        )}
      </div>
    </article>
  );
}

export function HomePage() {
  const { isOnline } = useConnection();
  const { session, logout } = useAuth();
  const [query, setQuery] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingReview, setEditingReview] = useState<ReviewRecord | null>(null);
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
    editReview,
    deleteReview,
  } = useReviews({
    query,
    token: session?.token ?? null,
    isOnline,
  });

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
      await deleteReview(review, "soft");
    } finally {
      setDeletingId(null);
    }
  }

  async function handleSubmit(input: ReviewInput) {
    if (editingReview && !editingReview.localOnly) {
      await editReview(editingReview.id, input);
      setEditingReview(null);
      setIsComposerOpen(false);
      return;
    }

    const result = await createOrQueueReview(input);
    if (result.mode === "online") {
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
                  Feed de visitas e histórico gastronômico.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)] sm:text-base">
                  Pesquise lanchonetes, acompanhe a linha do tempo das visitas e salve novas avaliações mesmo quando a conexão cair.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] hover:-translate-y-0.5"
                >
                  {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  {theme === "dark" ? "Tema claro" : "Tema escuro"}
                </button>

                {session?.role === 2 ? (
                  <Link
                    href="/admin"
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
                  >
                    <Shield className="h-4 w-4" />
                    Admin
                  </Link>
                ) : null}

                <button
                  type="button"
                  onClick={logout}
                  className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
                >
                  <LogOut className="h-4 w-4" />
                  Sair
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <label className="flex w-full items-center gap-3 rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 lg:max-w-xl">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar pelo nome da lanchonete"
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
          </div>
        </section>

        {searchTitle ? (
          <section className="rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] px-5 py-5 shadow-[var(--panel-shadow)] backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Local pesquisado</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{searchTitle}</h2>
              <div className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]">
                Média geral pública:{" "}
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
                <p className="text-sm font-semibold text-[var(--text)]">
                  {editingReview ? "Editar avaliação" : "Adicionar avaliação"}
                </p>
                <p className="text-xs text-[var(--muted-strong)]">
                  {editingReview
                    ? "Ajuste o conteúdo da visita selecionada."
                    : "Crie uma nova visita e ela entra na linha do tempo automaticamente."}
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
                <ReviewForm
                  initialValue={editingReview}
                  onCancelEdit={() => setEditingReview(null)}
                  onSubmit={handleSubmit}
                />
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

        <div className="grid gap-4 xl:grid-cols-2">
          {reviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              onEdit={(selected) => {
                setEditingReview(selected);
                setIsComposerOpen(true);
              }}
              onDelete={handleDelete}
              isDeleting={deletingId === review.id}
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

        {!isLoading && reviews.length === 0 ? (
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

