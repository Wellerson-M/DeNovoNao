"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  Bike,
  Wallet,
  Heart,
  ChevronRight,
  LoaderCircle,
  LogIn,
  LogOut,
  MapPin,
  MoonStar,
  Plus,
  RefreshCcw,
  Search,
  Settings2,
  Shield,
  Star,
  SunMedium,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { updateMyProfile } from "@/lib/api/auth";
import { LogoMark, Wordmark } from "@/components/brand";
import { ReviewForm } from "@/components/review-form";
import { useAuth } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useReviews } from "@/hooks/use-reviews";
import { useUi } from "@/contexts/ui-context";
import { formatPrice, formatPriceRange } from "@/lib/format-price";
import type { PriceRange, ReviewInput, ReviewRecord } from "@/lib/types";

type ThemeMode = "dark" | "light";

const SEARCH_DEBOUNCE_MS = 350;

function formatVisitedDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5 text-[var(--star)]" aria-label={`${value} de 5 estrelas`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star key={index} className={clsx("h-4 w-4", index < value ? "fill-current" : "opacity-40")} />
      ))}
    </div>
  );
}

function RatingBadge({ value }: { value: number }) {
  const tone = value <= 2 ? "low" : value === 3 ? "mid" : "high";
  const label = value <= 2 ? "De novo não" : value === 3 ? "Talvez" : "Repetiria";

  return (
    <span
      className={clsx(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
        tone === "low" && "bg-[var(--rating-low-bg)] text-[var(--rating-low-text)]",
        tone === "mid" && "bg-[var(--rating-mid-bg)] text-[var(--rating-mid-text)]",
        tone === "high" && "bg-[var(--rating-high-bg)] text-[var(--rating-high-text)]"
      )}
    >
      <span className="text-sm font-bold tabular-nums">{value}</span>
      {label}
    </span>
  );
}

function useThemeMode() {
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    // O script em layout.tsx já aplicou o tema salvo; aqui só sincronizamos o estado.
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      try {
        window.localStorage.setItem("denovonao-theme", next);
      } catch {
        // sem storage disponível: o tema vale só para esta sessão
      }
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
  index = 0,
  priceRange,
}: {
  review: ReviewRecord;
  canDelete: boolean;
  onDelete: (review: ReviewRecord) => Promise<void>;
  isDeleting: boolean;
  index?: number;
  priceRange?: PriceRange;
}) {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const opinions = [review.opinionOne, review.opinionTwo].map((text) => text?.trim()).filter(Boolean) as string[];

  return (
    <article
      className={clsx(
        "card-lift animate-fade-up rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-xl sm:p-5",
        !review.isPublic && "border-dashed"
      )}
      style={{ animationDelay: `${Math.min(index, 6) * 60}ms` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="break-words text-lg font-bold tracking-tight text-[var(--text)]">{review.placeName}</h3>
            {!review.isPublic ? (
              <span className="rounded-full border border-[var(--field-border)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--muted-strong)]">
                Privado
              </span>
            ) : null}
            {review.syncStatus ? (
              <span className="rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--danger-text)]">
                Aguardando conexão
              </span>
            ) : null}
          </div>

          <p className="flex items-center gap-1.5 text-sm text-[var(--muted-strong)]">
            {review.isDelivery ? <Bike className="h-4 w-4 shrink-0" /> : <MapPin className="h-4 w-4 shrink-0" />}
            <span className="truncate">{review.isDelivery ? "Delivery" : review.locationLabel}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <Stars value={review.placeRating} />
            <RatingBadge value={review.placeRating} />
          </div>
        </div>

        {canDelete && !isConfirmingDelete ? (
          <button
            type="button"
            onClick={() => setIsConfirmingDelete(true)}
            disabled={isDeleting}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)] disabled:opacity-50"
            aria-label="Excluir avaliação"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {isConfirmingDelete ? (
        <div className="animate-fade-up mt-4 flex flex-col gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-[var(--danger-text)]">Excluir a avaliação de {review.placeName}?</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(false)}
              className="flex-1 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm font-medium text-[var(--text-soft)] sm:flex-none"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={async () => {
                await onDelete(review);
                setIsConfirmingDelete(false);
              }}
              className="btn-primary flex-1 rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70 sm:flex-none"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </button>
          </div>
        </div>
      ) : null}

      {opinions.length > 0 ? (
        <div className={clsx("mt-4 grid gap-3", opinions.length > 1 && "sm:grid-cols-2")}>
          {opinions.map((text, index) => (
            <div key={index} className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
                {opinions.length > 1 ? `Opinião ${index + 1}` : "Opinião"}
              </p>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-soft)]">{text}</p>
            </div>
          ))}
        </div>
      ) : null}

      {review.criticalWarnings.length > 0 ? (
        <div className="mt-4 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4">
          <div className="flex items-center gap-2 text-[var(--danger-text)]">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Avisos críticos</p>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {review.criticalWarnings.map((flag, index) => (
              <span
                key={`${flag}-${index}`}
                className="rounded-full border border-[var(--danger-border)] bg-[var(--badge-bg)] px-3 py-1 text-xs font-medium text-[var(--danger-text)]"
              >
                {flag}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {review.priceAmount !== null || review.priceNote ? (
        <p className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-[var(--muted-strong)]">
          <Wallet className="h-4 w-4 shrink-0 text-[var(--muted)]" />
          {review.priceAmount !== null ? (
            <span className="font-semibold text-[var(--text-soft)]">{formatPrice(review.priceAmount)} por pessoa</span>
          ) : null}
          {review.priceNote ? <span className="break-words">{review.priceNote}</span> : null}
          {priceRange && priceRange.count > 1 ? (
            <span className="text-[var(--muted)]">
              · neste lugar: {formatPriceRange(priceRange.min, priceRange.max)}
            </span>
          ) : null}
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[var(--muted)]">
        <span>Visita em {formatVisitedDate(review.visitedAt)}</span>
        {review.isPublic && review.publisherLabel ? <span>Por {review.publisherLabel}</span> : null}
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

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session?.token) {
      setMessage("Faça login para atualizar seu perfil.");
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
      setMessage("Nenhuma alteração para salvar.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const response = await withLoader(updateMyProfile(payload, session.token));
      loginWithToken(response.token);
      setCurrentPassword("");
      setNewPassword("");
      setMessage("Perfil atualizado com sucesso.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível atualizar o perfil.");
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return null;
  }

  const fieldClass =
    "rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]";

  return (
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="profile-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[92dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-[var(--panel-border)] bg-[var(--panel-solid)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-[var(--hero-shadow)] sm:rounded-[28px]"
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <h2 id="profile-modal-title" className="text-lg font-bold text-[var(--text)]">
            Minha conta
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--text-soft)]"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Nome</span>
            <input value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} placeholder="Seu nome" autoComplete="name" />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Login</span>
            <input
              value={login}
              onChange={(event) => setLogin(event.target.value.toLowerCase())}
              className={fieldClass}
              placeholder="seu.login"
              autoCapitalize="none"
              autoComplete="username"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Senha atual</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className={fieldClass}
              placeholder="Obrigatória para trocar a senha"
              autoComplete="current-password"
            />
          </label>

          <label className="grid gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Nova senha</span>
            <input
              type="password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className={fieldClass}
              placeholder="Mínimo 6 caracteres"
              autoComplete="new-password"
            />
          </label>

          <div className="flex flex-col gap-3 pt-1 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <button type="submit" disabled={isSaving} className="btn-primary rounded-full px-5 py-3 text-sm font-semibold disabled:opacity-70">
              {isSaving ? "Salvando..." : "Salvar perfil"}
            </button>

            {message ? <p className="text-sm text-[var(--muted-strong)]">{message}</p> : null}
          </div>
        </form>
      </section>
    </div>
  );
}

const headerButtonClass =
  "inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-3 text-sm font-medium text-[var(--text-soft)] hover:border-[var(--accent-soft)] hover:text-[var(--text)] sm:px-4";

export function HomePage() {
  const { isOnline } = useConnection();
  const { session, logout, loginWithToken, sessionExpired, dismissSessionExpired } = useAuth();
  const { withLoader } = useUi();
  const [query, setQuery] = useState("");
  const debouncedQuery = useDebouncedValue(query.trim(), SEARCH_DEBOUNCE_MS);
  const [ratingFilter, setRatingFilter] = useState<number | null>(null);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [myVisibleCount, setMyVisibleCount] = useState(5);
  const composerRef = useRef<HTMLElement>(null);
  const { theme, toggleTheme } = useThemeMode();
  const closeProfileModal = useCallback(() => setIsProfileModalOpen(false), []);

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
    query: debouncedQuery,
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
  }, [debouncedQuery, ratingFilter]);

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
    const result = await createOrQueueReview(input);
    if (result?.mode === "online") {
      setIsComposerOpen(false);
    }
    return result;
  }

  function openComposer() {
    setIsComposerOpen(true);
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const searchTitle = debouncedQuery;
  const totalVisible = meta.total || reviews.length;
  const userLabel = session?.name ?? session?.login ?? "Usuário";

  return (
    <main className="min-h-screen text-[var(--text)]">
      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
        session={session}
        withLoader={withLoader}
        loginWithToken={loginWithToken}
      />

      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pb-28 pt-[max(1rem,env(safe-area-inset-top))] sm:gap-6 sm:px-6 sm:py-6 md:pb-10 lg:px-8">
        <section className="relative isolate overflow-hidden rounded-[28px] border border-[var(--hero-border)] bg-[image:var(--hero-bg)] p-4 shadow-[var(--hero-shadow)] backdrop-blur-2xl sm:rounded-[32px] sm:p-7">
          <div className="hero-glow -z-10" aria-hidden="true" />
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between gap-3">
              <Wordmark textClassName="max-[389px]:hidden" />

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className={headerButtonClass}
                  aria-label={theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro"}
                  title={theme === "dark" ? "Tema claro" : "Tema escuro"}
                >
                  <span key={theme} className="animate-spin-in inline-flex">
                    {theme === "dark" ? <SunMedium className="h-4 w-4" /> : <MoonStar className="h-4 w-4" />}
                  </span>
                </button>

                {session?.role === 2 ? (
                  <Link href="/admin" className={headerButtonClass} aria-label="Área administrativa" title="Admin">
                    <Shield className="h-4 w-4" />
                    <span className="hidden sm:inline">Admin</span>
                  </Link>
                ) : null}

                {session ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(true)}
                      className={clsx(headerButtonClass, "max-w-[11rem]")}
                      aria-label="Minha conta"
                      title="Minha conta"
                    >
                      <Settings2 className="h-4 w-4 shrink-0" />
                      <span className="hidden truncate sm:inline">{userLabel}</span>
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className={headerButtonClass}
                      aria-label="Sair"
                      title="Sair"
                    >
                      <LogOut className="h-4 w-4" />
                      <span className="hidden sm:inline">Sair</span>
                    </button>
                  </>
                ) : (
                  <Link href="/login" className="btn-primary inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold">
                    <LogIn className="h-4 w-4" />
                    Entrar
                  </Link>
                )}
              </div>
            </div>

            <div className="max-w-3xl">
              {session ? (
                <p className="text-sm font-medium text-[var(--muted-strong)]">Olá, {userLabel}!</p>
              ) : null}
              <h1 className="mt-1 text-[1.75rem] font-extrabold leading-tight tracking-tight text-[var(--text)] sm:text-5xl">
                Registre avaliações e <span className="text-gradient">não repita erros</span> gastronômicos.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-soft)] sm:mt-4 sm:text-base sm:leading-7">
                Um histórico para lembrar o que vale repetir, o que decepcionou e o que merece atenção antes do próximo pedido.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <label className="flex min-w-0 flex-1 items-center gap-3 rounded-[20px] border border-[var(--field-border)] bg-[var(--field-bg-strong)] px-4 py-3 focus-within:border-[var(--accent-soft)] focus-within:shadow-[0_0_0_3px_var(--accent-ring)] lg:max-w-xl">
                  <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                  <input
                    type="search"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Pesquisar por nome ou local"
                    enterKeyHint="search"
                    className="w-full min-w-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] [&::-webkit-search-cancel-button]:hidden"
                  />
                  {query ? (
                    <button
                      type="button"
                      onClick={() => setQuery("")}
                      className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--panel-hover)] text-[var(--muted-strong)]"
                      aria-label="Limpar busca"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </label>

                <button
                  type="button"
                  onClick={() => void handleRefresh()}
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center gap-2 rounded-[20px] border border-[var(--field-border)] bg-[var(--field-bg-strong)] text-sm font-medium text-[var(--text-soft)] hover:border-[var(--accent-soft)] sm:w-auto sm:px-4"
                  aria-label="Atualizar feed"
                >
                  <RefreshCcw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
                  <span className="hidden sm:inline">Atualizar</span>
                </button>
              </div>

              <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]">
                <div className="flex min-w-max items-center gap-2">
                  <span className="mr-1 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Nota</span>
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRatingFilter((current) => (current === value ? null : value))}
                      aria-pressed={ratingFilter === value}
                      className={clsx(
                        "inline-flex h-9 items-center gap-1 rounded-full border px-3.5 text-sm font-semibold",
                        ratingFilter === value
                          ? "btn-primary border-transparent"
                          : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)] hover:border-[var(--accent-soft)]"
                      )}
                    >
                      <Star className={clsx("h-3.5 w-3.5", ratingFilter === value ? "fill-current" : "text-[var(--star)]")} />
                      {value}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section
          ref={composerRef}
          className="scroll-mt-4 overflow-hidden rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] shadow-[var(--panel-shadow)] backdrop-blur-xl sm:rounded-[28px]"
        >
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-[var(--panel-hover)] sm:px-5"
            aria-expanded={isComposerOpen}
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="btn-primary flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl">
                <Plus className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="text-base font-bold text-[var(--text)]">Adicionar avaliação</p>
                <p className="text-xs text-[var(--muted-strong)] sm:text-sm">Cada envio vira uma nova visita na linha do tempo do lugar.</p>
              </div>
            </div>

            <ChevronRight className={clsx("h-5 w-5 shrink-0 text-[var(--muted)] transition-transform duration-200", isComposerOpen && "rotate-90")} />
          </button>

          <div
            className={clsx(
              "grid transition-[grid-template-rows,opacity] duration-300 ease-out",
              isComposerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
            inert={!isComposerOpen}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[var(--panel-border)] p-4 sm:p-5">
                <ReviewForm onSubmit={handleSubmit} />
              </div>
            </div>
          </div>
        </section>

        {sessionExpired ? (
          <div className="animate-fade-up flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            <span>Sua sessão expirou. Entre de novo para ver e publicar as suas avaliações.</span>
            <span className="flex gap-2">
              <button type="button" onClick={dismissSessionExpired} className="rounded-full px-3 py-1.5 font-semibold">
                Agora não
              </button>
              <Link href="/login" onClick={dismissSessionExpired} className="btn-primary rounded-full px-4 py-1.5 font-semibold">
                Entrar
              </Link>
            </span>
          </div>
        ) : null}

        {error ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[20px] border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
            <span>
              {/fetch|network|load failed/i.test(error)
                ? "Não foi possível falar com o servidor. Ele pode estar acordando; tente de novo em alguns segundos."
                : error}
            </span>
            <button
              type="button"
              onClick={() => void handleRefresh()}
              disabled={isRefreshing}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--danger-border)] px-4 py-1.5 font-semibold disabled:opacity-60"
            >
              <RefreshCcw className={clsx("h-4 w-4", isRefreshing && "animate-spin")} />
              Tentar de novo
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h2 className="text-2xl font-extrabold tracking-tight text-[var(--text)]">
              {searchTitle ? (
                <>
                  Resultados para <span className="text-gradient">“{searchTitle}”</span>
                </>
              ) : (
                "Últimas avaliações"
              )}
            </h2>
            <p className="mt-1 text-sm text-[var(--muted-strong)]">
              {isLoading ? "Carregando..." : `${totalVisible} ${totalVisible === 1 ? "avaliação visível" : "avaliações visíveis"}`}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid gap-4" aria-hidden="true">
            {[0, 1].map((index) => (
              <div key={index} className="skeleton h-40 rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)]" />
            ))}
          </div>
        ) : (
          <>
            <section className="grid gap-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                <Heart className="h-5 w-5 text-[var(--accent-soft)]" />
                Minhas avaliações
              </h3>

              {!session ? (
                <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                  <LogoMark className="h-8 w-8 shrink-0 text-[var(--accent-soft)] opacity-60" />
                  <span>
                    <Link href="/login" className="font-semibold text-[var(--accent-soft)] underline-offset-4 hover:underline">
                      Faça login
                    </Link>{" "}
                    para registrar e gerenciar suas avaliações.
                  </span>
                </div>
              ) : myReviews.length === 0 ? (
                <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                  <LogoMark className="h-8 w-8 shrink-0 text-[var(--accent-soft)] opacity-60" />
                  {searchTitle || ratingFilter ? "Nenhuma avaliação sua para este filtro." : "Você ainda não tem avaliações. Que tal registrar a primeira?"}
                </div>
              ) : (
                <>
                  {myReviews.slice(0, myVisibleCount).map((review, index) => (
                    <ReviewCard
                      index={index}
                      key={review.id}
                      priceRange={meta.priceRanges?.[review.placeName.toLowerCase()]}
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
                      className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)]"
                    >
                      Ver mais ({myReviews.length - myVisibleCount} restantes)
                    </button>
                  ) : null}
                </>
              )}
            </section>

            <section className="grid gap-4">
              <h3 className="flex items-center gap-2 text-lg font-bold text-[var(--text)]">
                <Users className="h-5 w-5 text-[var(--accent-soft)]" />
                De outras pessoas
              </h3>

              {otherReviews.length === 0 ? (
                <div className="flex items-center gap-3 rounded-[20px] border border-dashed border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--muted-strong)]">
                  <LogoMark className="h-8 w-8 shrink-0 text-[var(--accent-soft)] opacity-60" />
                  Nenhuma avaliação pública de outras pessoas para este filtro.
                </div>
              ) : (
                otherReviews.map((review, index) => (
                  <ReviewCard
                    index={index}
                    key={review.id}
                    priceRange={meta.priceRanges?.[review.placeName.toLowerCase()]}
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
                disabled={isLoadingMore}
                className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)] disabled:opacity-70"
              >
                {isLoadingMore ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                Carregar mais
              </button>
            ) : null}
          </>
        )}
      </div>

      {session && !isComposerOpen ? (
        <button
          type="button"
          onClick={openComposer}
          className="btn-primary animate-pop-in safe-bottom fixed right-4 z-[80] inline-flex h-14 items-center gap-2 rounded-full px-5 text-sm font-bold md:hidden"
        >
          <Plus className="h-5 w-5" />
          Nova avaliação
        </button>
      ) : null}
    </main>
  );
}
