"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  ChevronRight,
  LoaderCircle,
  LogOut,
  MoonStar,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Shield,
  Star,
  SunMedium,
  Trash2,
  X,
} from "lucide-react";
import { updateMyProfile } from "@/lib/api/auth";
import { ReviewForm } from "@/components/review-form";
import { useAuth } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";
import { useReviews } from "@/hooks/use-reviews";
import { useUi } from "@/contexts/ui-context";
import type { ReviewInput, ReviewRecord } from "@/lib/types";

type ThemeMode = "dark" | "light";

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

function isOwnCoupleReview(review: ReviewRecord, session: ReturnType<typeof useAuth>["session"]) {
  if (review.localOnly) {
    return true;
  }

  return Boolean(session?.id_casal && review.id_casal === session.id_casal);
}

function ReviewCard({
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
    <article className={clsx("rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] p-4", !review.isPublic && "opacity-90")}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">{review.placeName}</h3>
            {!review.isPublic ? (
              <span className="rounded-full border border-[var(--field-border)] bg-[var(--panel)] px-2.5 py-1 text-[11px] font-medium text-[var(--muted-strong)] opacity-80">
                Privado
              </span>
            ) : null}
            {review.syncStatus ? (
              <span className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--danger-text)]">
                Nao postado, aguardando conexao
              </span>
            ) : null}
          </div>

          <p className="text-sm text-[var(--muted-strong)]">{review.isDelivery ? "Delivery" : review.locationLabel}</p>
          <Stars value={review.placeRating} />
        </div>

        {canDelete ? (
          <button
            type="button"
            onClick={() => void onDelete(review)}
            disabled={isDeleting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--field-border)] bg-[var(--panel)] text-[var(--muted-strong)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] disabled:opacity-50"
            aria-label="Excluir avaliacao"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--panel)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opiniao 1</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.opinionOne || "Sem comentario."}</p>
        </div>

        <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--panel)] p-4">
          <p className="text-[11px] uppercase tracking-[0.24em] text-[var(--muted)]">Opiniao 2</p>
          <p className="mt-3 text-sm leading-6 text-[var(--text-soft)]">{review.opinionTwo || "Sem comentario."}</p>
        </div>
      </div>

      {review.criticalWarnings.length > 0 ? (
        <div className="mt-4 rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--danger-text)]">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[11px] uppercase tracking-[0.24em]">Avisos criticos</p>
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
        {review.isPublic && review.publisherLabel ? <span>Publicado por: {review.publisherLabel}</span> : null}
      </div>
    </article>
  );
}

function ProfileModal({
  isOpen,
  onClose,
  session,
  withLoader,
  loginWithToken,
}: {
  isOpen: boolean;
  onClose: () => void;
  session: ReturnType<typeof useAuth>["session"];
  withLoader: ReturnType<typeof useUi>["withLoader"];
  loginWithToken: (token: string) => void;
}) {
  const [name, setName] = useState(session?.name ?? "");
  const [login, setLogin] = useState(session?.login ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setName(session?.name ?? "");
      setLogin(session?.login ?? "");
      setCurrentPassword("");
      setNewPassword("");
      setMessage(null);
    }
  }, [isOpen, session?.name, session?.login]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      setMessage("Faca login para atualizar seu perfil.");
      return;
    }

    const payload: {
      name?: string;
      login?: string;
      currentPassword?: string;
      newPassword?: string;
    } = {};

    const nextName = name.trim();
    const nextLogin = login.trim().toLowerCase();

    if (nextName && nextName !== (session.name ?? "")) {
      payload.name = nextName;
    }

    if (nextLogin && nextLogin !== (session.login ?? "")) {
      payload.login = nextLogin;
    }

    if (newPassword) {
      payload.currentPassword = currentPassword;
      payload.newPassword = newPassword;
    }

    if (!payload.name && !payload.login && !payload.newPassword) {
      setMessage("Nenhuma alteracao para salvar.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await withLoader(updateMyProfile(payload, session.token), 360);
      loginWithToken(response.token);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Nao foi possivel atualizar o perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/35 p-4 backdrop-blur-sm">
      <section className="w-full max-w-xl rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--hero-shadow)] sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-[var(--text)]">Minha conta</h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--text-soft)]"
            aria-label="Fechar modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Nome</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm outline-none"
              placeholder="Seu nome"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Login</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value.toLowerCase())}
              className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm outline-none"
              placeholder="seu.login"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Senha atual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm outline-none"
              placeholder="Obrigatoria para trocar senha"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Nova senha</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm outline-none"
              placeholder="Minimo 6 caracteres"
            />
          </label>

          <div className="flex flex-col gap-2 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={isSaving}
              className="rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
            >
              {isSaving ? "Salvando..." : "Salvar perfil"}
            </button>

            {message ? <p className="text-sm text-[var(--muted-strong)]">{message}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}

export function HomePage() {
  const { isOnline } = useConnection();
  const { session, logout, loginWithToken } = useAuth();
  const { showLoaderFor, withLoader } = useUi();
  const [query, setQuery] = useState("");
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [myVisibleCount, setMyVisibleCount] = useState(5);
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

  const sortedReviews = useMemo(
    () => [...reviews].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [reviews]
  );

  const myReviews = useMemo(
    () => sortedReviews.filter((review) => isOwnCoupleReview(review, session)),
    [session, sortedReviews]
  );

  const otherReviews = useMemo(
    () => sortedReviews.filter((review) => !isOwnCoupleReview(review, session) && review.isPublic),
    [session, sortedReviews]
  );

  useEffect(() => {
    setMyVisibleCount(5);
  }, [query, ratingFilter, myReviews.length]);

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
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        session={session}
        withLoader={withLoader}
        loginWithToken={loginWithToken}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-3.5 py-4 sm:gap-6 sm:px-6 sm:py-6 lg:px-8">
        <section className="overflow-hidden rounded-[28px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-4 shadow-[var(--hero-shadow)] backdrop-blur-2xl sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="max-w-3xl">
                <p className="inline-flex rounded-full border border-[var(--hero-border)] bg-[var(--field-bg)] px-3 py-1 text-xs uppercase tracking-[0.28em] text-[var(--muted)]">
                  DeNovoNao
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
                  Registre avaliacoes e nao repita erros gastronomicos.
                </h1>
                <p className="mt-4 max-w-2xl text-sm leading-7 text-[var(--text-soft)] sm:text-base">
                  Um historico pessoal para lembrar o que vale repetir, o que decepcionou e o que merece atencao antes do proximo pedido.
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

                {session ? (
                  <button
                    type="button"
                    onClick={() => setIsProfileModalOpen(true)}
                    className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
                  >
                    <Settings2 className="h-4 w-4" />
                    Minha conta
                  </button>
                ) : null}

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
                      {session.name ?? session.login ?? "Usuario"}
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
              <label className="flex w-full items-center gap-3 rounded-[22px] border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 lg:max-w-xl">
                <Search className="h-4 w-4 text-[var(--muted)]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Pesquisar por nome ou local"
                  className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                />
                {query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-[var(--field-border)] bg-[var(--panel)] text-[var(--muted)]"
                    aria-label="Limpar busca"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                ) : null}
              </label>

              <button
                type="button"
                onClick={() => void handleRefresh()}
                className="inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)] hover:-translate-y-0.5"
              >
                <RefreshCcw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
                Atualizar
              </button>
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
          <section className="rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] px-4 py-4 shadow-[var(--panel-shadow)] backdrop-blur-xl sm:rounded-[28px] sm:px-5 sm:py-5">
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--muted)]">Resultado da busca</p>
            <div className="mt-3">
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">{searchTitle}</h2>
            </div>
          </section>
        ) : null}

        <section className="overflow-hidden rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[var(--panel-shadow)] backdrop-blur-xl sm:rounded-[30px]">
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-[var(--panel-hover)] sm:px-5"
            aria-expanded={isComposerOpen}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--accent-soft)]/25 bg-[var(--accent-glass)] text-[var(--accent-contrast)] shadow-sm">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--text)]">Adicionar avaliacao</p>
                <p className="text-xs text-[var(--muted-strong)]">
                  Cada novo envio entra como uma nova visita na linha do tempo do mesmo restaurante.
                </p>
              </div>
            </div>

            <ChevronRight className={clsx("h-5 w-5 text-[var(--muted)] transition-transform duration-200", isComposerOpen && "rotate-90")} />
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
            <h2 className="text-2xl font-semibold tracking-tight text-[var(--text)]">Ultimas avaliacoes</h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {meta.total || reviews.length} registro(s) visiveis para este usuario
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
            Carregando avaliacoes...
          </div>
        ) : null}

        <section className="grid gap-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Minhas avaliacoes</h3>

          {!session ? (
            <div className="rounded-3xl border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--muted-strong)]">
              Faca login para visualizar e gerenciar suas avaliacoes.
            </div>
          ) : myReviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--muted-strong)]">
              Voce ainda nao possui avaliacoes para esta busca.
            </div>
          ) : (
            <>
              {myReviews.slice(0, myVisibleCount).map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  canDelete={canManageReview(review, session)}
                  onDelete={handleDelete}
                  isDeleting={deletingId === review.id}
                />
              ))}

              {myVisibleCount < myReviews.length ? (
                <button
                  type="button"
                  onClick={() => setMyVisibleCount((current) => current + 5)}
                  className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-medium text-[var(--text-soft)]"
                >
                  Ver mais das minhas ( +5 )
                </button>
              ) : null}
            </>
          )}
        </section>

        <section className="grid gap-4">
          <h3 className="text-lg font-semibold text-[var(--text)]">Avaliacoes de outros usuarios</h3>

          {otherReviews.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--muted-strong)]">
              Nenhuma avaliacao publica de outros usuarios encontrada para esta busca.
            </div>
          ) : (
            otherReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                canDelete={canManageReview(review, session)}
                onDelete={handleDelete}
                isDeleting={deletingId === review.id}
              />
            ))
          )}
        </section>

        {meta.hasMore ? (
          <button
            type="button"
            onClick={() => void loadMore()}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-medium text-[var(--text-soft)] hover:-translate-y-0.5"
          >
            {isLoadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
            Carregar mais do feed
          </button>
        ) : null}
      </div>

      <button
        type="button"
        onClick={() => {
          setIsComposerOpen(true);
          if (typeof window !== "undefined") {
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        className="fixed bottom-4 right-4 z-[80] inline-flex items-center gap-2 rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,1,22,0.25)] md:hidden"
      >
        <Plus className="h-4 w-4" />
        Nova
      </button>
    </main>
  );
}
