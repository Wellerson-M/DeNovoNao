"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  AlertTriangle,
  ArrowLeft,
  Bike,
  CalendarDays,
  ChevronRight,
  LoaderCircle,
  MapPin,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { LogoIcon } from "@/components/brand";
import { Chip, EmptyState, LoadingRows, SearchField } from "@/components/admin/ui";
import { LogsPanel } from "@/components/admin/logs-panel";
import { OverviewPanel } from "@/components/admin/overview-panel";
import { TrashPanel } from "@/components/admin/trash-panel";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  deleteAdminUser,
  fetchAdminReviews,
  fetchAdminUserReviews,
  fetchAdminUsers,
  updateAdminUser,
} from "@/lib/api/admin";
import { removeReview, restoreReview } from "@/lib/api/reviews";
import type { ReviewRecord, UserRecord } from "@/lib/types";

type AdminTab = "overview" | "reviews" | "trash" | "logs" | "users";

// Cada aba tem endereço próprio (/admin#lixeira), então dá para salvar o link.
const TAB_HASHES: Record<AdminTab, string> = {
  overview: "resumo",
  reviews: "moderacao",
  trash: "lixeira",
  logs: "ocorrencias",
  users: "usuarios",
};

function tabFromHash(): AdminTab | null {
  const hash = window.location.hash.replace("#", "");
  const entry = (Object.entries(TAB_HASHES) as Array<[AdminTab, string]>).find(([, value]) => value === hash);
  return entry ? entry[0] : null;
}

type ModerationGroup = {
  key: string;
  placeName: string;
  locationLabel: string;
  isDelivery: boolean;
  reviews: ReviewRecord[];
};

const ROLE_LABELS: Record<number, string> = { 0: "Visitante", 1: "Usuário", 2: "Admin" };

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

/**
 * Tela cheia no celular para detalhes. Cada tela aberta empilha um item no histórico,
 * então o botão "voltar" do aparelho fecha só a tela de cima em vez de sair do painel.
 */
function sheetStack(): string[] {
  const stack = window.history.state?.adminSheets;
  return Array.isArray(stack) ? stack : [];
}

function useMobileSheet(name: string) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handlePopState = () => setIsOpen(sheetStack().includes(name));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [name]);

  const open = useCallback(() => {
    if (window.matchMedia("(min-width: 1280px)").matches || sheetStack().includes(name)) {
      return;
    }
    window.history.pushState({ ...window.history.state, adminSheets: [...sheetStack(), name] }, "");
    setIsOpen(true);
  }, [name]);

  const close = useCallback(() => {
    const stack = sheetStack();
    if (stack[stack.length - 1] === name) {
      window.history.back();
    } else {
      setIsOpen(false);
    }
  }, [name]);

  return { isOpen, open, close };
}

function MobileSheet({
  isOpen,
  title,
  onClose,
  children,
}: {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="animate-fade-up fixed inset-0 z-[110] flex flex-col bg-[var(--page-bg-solid)] xl:hidden" role="dialog" aria-modal="true" aria-label={title}>
      <header className="flex items-center gap-3 border-b border-[var(--panel-border)] bg-[var(--panel-solid)] px-3 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex h-10 items-center gap-1.5 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] pl-3 pr-4 text-sm font-semibold text-[var(--text-soft)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar
        </button>
        <h2 className="min-w-0 truncate text-base font-bold">{title}</h2>
      </header>
      <div className="flex-1 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">{children}</div>
    </div>
  );
}

function ReviewDetail({
  review,
  busyId,
  onDelete,
  onRestore,
}: {
  review: ReviewRecord;
  busyId: string | null;
  onDelete: (review: ReviewRecord, mode: "soft" | "hard") => Promise<void>;
  onRestore: (review: ReviewRecord) => Promise<void>;
}) {
  const [confirmHard, setConfirmHard] = useState(false);
  const isBusy = busyId === review.id;
  const opinions = [review.opinionOne, review.opinionTwo].map((text) => text?.trim()).filter(Boolean) as string[];

  useEffect(() => setConfirmHard(false), [review.id]);

  return (
    <article className="grid gap-4">
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-xl font-extrabold tracking-tight">{review.placeName}</h3>
          {!review.active ? <Chip tone="danger">Na lixeira</Chip> : null}
          {!review.isPublic ? <Chip>Privada</Chip> : null}
        </div>
        <p className="flex items-center gap-1.5 text-sm text-[var(--muted-strong)]">
          {review.isDelivery ? <Bike className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
          {review.isDelivery ? "Delivery" : review.locationLabel}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--muted-strong)]">
          <span className="flex items-center gap-0.5 text-[var(--star)]" aria-label={`${review.placeRating} de 5 estrelas`}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Star key={index} className={clsx("h-4 w-4", index < review.placeRating ? "fill-current" : "opacity-35")} />
            ))}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            {formatVisitDate(review.visitedAt)}
          </span>
          {review.publisherLabel ? (
            <span className="flex items-center gap-1.5">
              <UserRound className="h-4 w-4" />
              {review.publisherLabel}
            </span>
          ) : null}
        </div>
      </div>

      {opinions.length > 0 ? (
        <div className={clsx("grid gap-3", opinions.length > 1 && "sm:grid-cols-2")}>
          {opinions.map((text, index) => (
            <div key={index} className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--accent-soft)]">
                {opinions.length > 1 ? `Opinião ${index + 1}` : "Opinião"}
              </p>
              <p className="mt-2 whitespace-pre-line break-words text-sm leading-6 text-[var(--text-soft)]">{text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-[var(--muted)]">Sem opiniões escritas.</p>
      )}

      {review.criticalWarnings.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-[var(--danger-text)]" />
          {review.criticalWarnings.map((flag, index) => (
            <Chip key={`${flag}-${index}`} tone="danger">
              {flag}
            </Chip>
          ))}
        </div>
      ) : null}

      <div className="grid gap-2 border-t border-[var(--panel-border)] pt-4">
        {confirmHard ? (
          <div className="animate-fade-up grid gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
            <p className="text-sm text-[var(--danger-text)]">
              Excluir de vez <strong>{review.placeName}</strong>? Isso não pode ser desfeito.
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setConfirmHard(false)}
                className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onDelete(review, "hard")}
                className="btn-primary rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-70"
              >
                {isBusy ? "Excluindo..." : "Excluir de vez"}
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {review.active ? (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onDelete(review, "soft")}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)] disabled:opacity-70"
              >
                {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Mover p/ lixeira
              </button>
            ) : (
              <button
                type="button"
                disabled={isBusy}
                onClick={() => void onRestore(review)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--success-border)] bg-[var(--success-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--success-text)] disabled:opacity-70"
              >
                {isBusy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                Restaurar
              </button>
            )}
            <button
              type="button"
              disabled={isBusy}
              onClick={() => setConfirmHard(true)}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--danger-text)] disabled:opacity-70"
            >
              <Trash2 className="h-4 w-4" />
              Excluir de vez
            </button>
          </div>
        )}
        <p className="text-xs text-[var(--muted)]">Na lixeira, a avaliação some do feed mas pode ser restaurada.</p>
      </div>
    </article>
  );
}

function ReviewListItem({ review, isSelected, onSelect }: { review: ReviewRecord; isSelected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left",
        isSelected ? "border-[var(--accent-soft)] bg-[var(--accent-glass)]" : "border-[var(--field-border)] bg-[var(--field-bg)] hover:border-[var(--accent-soft)]",
        !review.active && "opacity-70"
      )}
    >
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="truncate text-sm font-semibold">{review.createdByName ?? review.publisherLabel ?? "Autor não identificado"}</span>
          {!review.active ? <Chip tone="danger">Lixeira</Chip> : null}
          {!review.isPublic ? <Chip>Privada</Chip> : null}
        </span>
        <span className="mt-1 flex items-center gap-2 text-xs text-[var(--muted)]">
          <span className="inline-flex items-center gap-0.5 font-semibold text-[var(--star)]">
            <Star className="h-3 w-3 fill-current" />
            {review.placeRating}
          </span>
          {formatVisitDate(review.visitedAt)}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
    </button>
  );
}

export function AdminPage() {
  const { session } = useAuth();
  const [tab, setTab] = useState<AdminTab>("overview");
  const [logsFilter, setLogsFilter] = useState("all");
  const [dataVersion, setDataVersion] = useState(0);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [userReviews, setUserReviews] = useState<ReviewRecord[]>([]);
  const [editedPairs, setEditedPairs] = useState<Record<string, string>>({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [userReviewsLoading, setUserReviewsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [confirmDeleteUserId, setConfirmDeleteUserId] = useState<string | null>(null);
  const [busyReviewId, setBusyReviewId] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [selectedUserReviewPage, setSelectedUserReviewPage] = useState(1);
  const [hasMoreSelectedUserReviews, setHasMoreSelectedUserReviews] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [selectedUserReviewQuery, setSelectedUserReviewQuery] = useState("");
  const debouncedUserQuery = useDebouncedValue(userQuery.trim());
  const debouncedReviewQuery = useDebouncedValue(reviewQuery.trim());
  const debouncedSelectedUserReviewQuery = useDebouncedValue(selectedUserReviewQuery.trim());
  const feedbackTimer = useRef<number | null>(null);
  const reviewSheet = useMobileSheet("review");
  const userSheet = useMobileSheet("user");

  useEffect(() => {
    const fromHash = tabFromHash();
    if (fromHash) {
      setTab(fromHash);
    }
  }, []);

  function changeTab(next: AdminTab) {
    setTab(next);
    // replaceState para não atrapalhar o "voltar" das telas cheias do celular.
    window.history.replaceState(window.history.state, "", `#${TAB_HASHES[next]}`);
  }

  const adminToken = session?.token ?? "";
  const isAdmin = Boolean(session && session.role >= 2);

  function notify(tone: "success" | "error", text: string) {
    setFeedback({ tone, text });
    if (feedbackTimer.current) {
      window.clearTimeout(feedbackTimer.current);
    }
    feedbackTimer.current = window.setTimeout(() => setFeedback(null), 3500);
  }

  async function loadUsers() {
    setUsersLoading(true);
    try {
      const response = await fetchAdminUsers(adminToken, debouncedUserQuery);
      setUsers(response.items);
      setEditedPairs(Object.fromEntries(response.items.map((user) => [user.id, user.id_casal ?? ""])));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível carregar usuários");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadReviews(page = 1, mode: "replace" | "append" = "replace") {
    setReviewsLoading(true);
    try {
      const response = await fetchAdminReviews(adminToken, page, debouncedReviewQuery, "alpha");
      setReviewPage(page);
      setHasMoreReviews(response.meta.hasMore);
      setReviews((current) => (mode === "append" ? [...current, ...response.items] : response.items));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível carregar avaliações");
    } finally {
      setReviewsLoading(false);
    }
  }

  async function loadSelectedUserReviews(user: UserRecord, page = 1, mode: "replace" | "append" = "replace") {
    setUserReviewsLoading(true);
    try {
      const response = await fetchAdminUserReviews(adminToken, user.id, page, debouncedSelectedUserReviewQuery);
      setSelectedUserReviewPage(page);
      setHasMoreSelectedUserReviews(response.meta.hasMore);
      setUserReviews((current) => (mode === "append" ? [...current, ...response.items] : response.items));
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível carregar as avaliações do usuário");
    } finally {
      setUserReviewsLoading(false);
    }
  }

  useEffect(() => {
    if (isAdmin && tab === "users") {
      void loadUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab, debouncedUserQuery]);

  useEffect(() => {
    if (isAdmin && tab === "reviews") {
      void loadReviews(1, "replace");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab, debouncedReviewQuery]);

  useEffect(() => {
    if (selectedUser) {
      void loadSelectedUserReviews(selectedUser, 1, "replace");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id, debouncedSelectedUserReviewQuery]);

  function openUser(user: UserRecord) {
    if (selectedUser?.id !== user.id) {
      setUserReviews([]);
      setSelectedUserReviewQuery("");
    }
    setSelectedUser(user);
    userSheet.open();
  }

  async function handleDeleteUser(user: UserRecord) {
    setDeletingUserId(user.id);
    try {
      await deleteAdminUser(adminToken, user.id);
      setUsers((current) => current.filter((item) => item.id !== user.id));
      if (selectedUser?.id === user.id) {
        setSelectedUser(null);
        setUserReviews([]);
      }
      notify("success", `Usuário ${user.name} excluído.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível excluir o usuário");
    } finally {
      setDeletingUserId(null);
      setConfirmDeleteUserId(null);
    }
  }

  async function handleUserSave(userId: string) {
    setSavingUserId(userId);
    try {
      const updated = await updateAdminUser(userId, { id_casal: editedPairs[userId]?.trim() || null }, adminToken);
      setUsers((current) => current.map((user) => (user.id === userId ? updated : user)));
      setEditedPairs((current) => ({ ...current, [userId]: updated.id_casal ?? "" }));
      if (selectedUser?.id === userId) {
        setSelectedUser(updated);
        await loadSelectedUserReviews(updated);
      }
      notify("success", "Casal atualizado.");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSavingUserId(null);
    }
  }

  async function refreshAfterReviewChange() {
    setDataVersion((current) => current + 1);
    await loadReviews(1, "replace");
    if (selectedUser) {
      await loadSelectedUserReviews(selectedUser);
    }
  }

  async function handleDelete(review: ReviewRecord, mode: "soft" | "hard") {
    setBusyReviewId(review.id);
    try {
      await removeReview(review.id, adminToken, mode);
      if (mode === "hard") {
        reviewSheet.close();
      }
      await refreshAfterReviewChange();
      notify("success", mode === "hard" ? `${review.placeName} excluída de vez.` : `${review.placeName} foi para a lixeira.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível excluir");
    } finally {
      setBusyReviewId(null);
    }
  }

  async function handleRestore(review: ReviewRecord) {
    setBusyReviewId(review.id);
    try {
      await restoreReview(review.id, adminToken);
      await refreshAfterReviewChange();
      notify("success", `${review.placeName} restaurada.`);
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível restaurar");
    } finally {
      setBusyReviewId(null);
    }
  }

  const moderationGroups = useMemo<ModerationGroup[]>(() => {
    const sorted = [...reviews].sort((a, b) => {
      const placeCompare = a.placeName.localeCompare(b.placeName, "pt-BR");
      return placeCompare !== 0 ? placeCompare : new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
    });
    const groups = new Map<string, ModerationGroup>();

    for (const review of sorted) {
      const key = `${review.placeName.toLowerCase()}::${review.locationLabel.toLowerCase()}`;
      const group = groups.get(key);
      if (group) {
        group.reviews.push(review);
      } else {
        groups.set(key, { key, placeName: review.placeName, locationLabel: review.locationLabel, isDelivery: review.isDelivery, reviews: [review] });
      }
    }

    return Array.from(groups.values());
  }, [reviews]);

  const selectedReview =
    reviews.find((review) => review.id === selectedReviewId) ?? userReviews.find((review) => review.id === selectedReviewId) ?? null;

  if (!isAdmin) {
    return (
      <main className="min-h-screen text-[var(--text)]">
        <div className="mx-auto flex min-h-screen max-w-xl items-center px-4 py-10">
          <section className="w-full rounded-[28px] border border-[var(--danger-border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Acesso restrito</h1>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">O painel administrativo é exclusivo para administradores.</p>
              </div>
            </div>
            <Link href="/" className="btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao feed
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const reviewDetail = selectedReview ? (
    <ReviewDetail review={selectedReview} busyId={busyReviewId} onDelete={handleDelete} onRestore={handleRestore} />
  ) : null;

  const userReviewsPanel = selectedUser ? (
    <div className="grid gap-3">
      <p className="text-sm text-[var(--muted-strong)]">
        Casal <strong className="text-[var(--text)]">{selectedUser.id_casal ?? "sem vínculo"}</strong> · da visita mais nova para a mais antiga.
      </p>
      <SearchField value={selectedUserReviewQuery} onChange={setSelectedUserReviewQuery} placeholder="Buscar nas avaliações" />
      {userReviewsLoading && userReviews.length === 0 ? <LoadingRows /> : null}
      {!userReviewsLoading && userReviews.length === 0 ? <EmptyState>Nenhuma avaliação encontrada.</EmptyState> : null}
      {userReviews.map((review) => (
        <ReviewListItem
          key={review.id}
          review={review}
          isSelected={selectedReviewId === review.id}
          onSelect={() => {
            setSelectedReviewId(review.id);
            // No celular abre os detalhes por cima da lista do usuário.
            reviewSheet.open();
          }}
        />
      ))}
      {hasMoreSelectedUserReviews ? (
        <button
          type="button"
          onClick={() => void loadSelectedUserReviews(selectedUser, selectedUserReviewPage + 1, "append")}
          className="mx-auto rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)]"
        >
          Carregar mais
        </button>
      ) : null}
      {selectedReview && userReviews.some((review) => review.id === selectedReview.id) ? (
        <div className="hidden rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 xl:block">{reviewDetail}</div>
      ) : null}
    </div>
  ) : null;

  return (
    <main className="min-h-screen text-[var(--text)]">
      <header className="sticky top-0 z-[60] border-b border-[var(--panel-border)] bg-[color-mix(in_srgb,var(--page-bg-solid)_82%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/"
            className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] pl-3 pr-4 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <LogoIcon className="h-7 w-7 shrink-0" />
            <h1 className="truncate text-lg font-extrabold tracking-tight">Painel admin</h1>
          </div>
        </div>

        <div className="mx-auto max-w-6xl px-4 pb-3 sm:px-6">
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 [scrollbar-width:none]">
            <div className="flex min-w-max gap-1 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] p-1" role="tablist">
              {[
                { key: "overview" as const, label: "Resumo" },
                { key: "reviews" as const, label: "Moderação" },
                { key: "trash" as const, label: "Lixeira" },
                { key: "logs" as const, label: "Ocorrências" },
                { key: "users" as const, label: "Usuários" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="tab"
                  aria-selected={tab === item.key}
                  onClick={() => changeTab(item.key)}
                  className={clsx(
                    "shrink-0 rounded-full px-4 py-2 text-sm font-semibold",
                    tab === item.key ? "btn-primary" : "text-[var(--text-soft)]"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 pb-24 pt-5 sm:px-6">
        {tab === "overview" ? (
          <OverviewPanel
            token={adminToken}
            refreshKey={dataVersion}
            onError={(message) => notify("error", message)}
            onOpenTrash={() => changeTab("trash")}
            onOpenLogs={() => {
              setLogsFilter("auth.login_failed");
              changeTab("logs");
            }}
          />
        ) : tab === "trash" ? (
          <TrashPanel token={adminToken} notify={notify} onChanged={() => setDataVersion((current) => current + 1)} />
        ) : tab === "logs" ? (
          <LogsPanel token={adminToken} notify={notify} initialFilter={logsFilter} />
        ) : tab === "reviews" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] xl:items-start">
            <div className="grid gap-4">
              <SearchField value={reviewQuery} onChange={setReviewQuery} placeholder="Buscar local, opinião, aviso ou nota" />

              {reviewsLoading && reviews.length === 0 ? <LoadingRows /> : null}
              {!reviewsLoading && moderationGroups.length === 0 ? <EmptyState>Nenhuma avaliação encontrada.</EmptyState> : null}

              {moderationGroups.map((group) => (
                <section key={group.key} className="grid gap-2">
                  <div className="flex items-baseline justify-between gap-3 px-1">
                    <h2 className="min-w-0 truncate text-base font-bold">{group.placeName}</h2>
                    <span className="shrink-0 text-xs text-[var(--muted)]">
                      {group.isDelivery ? "Delivery" : group.locationLabel} · {group.reviews.length}
                    </span>
                  </div>
                  {group.reviews.map((review) => (
                    <ReviewListItem
                      key={review.id}
                      review={review}
                      isSelected={selectedReviewId === review.id}
                      onSelect={() => {
                        setSelectedReviewId(review.id);
                        reviewSheet.open();
                      }}
                    />
                  ))}
                </section>
              ))}

              {hasMoreReviews ? (
                <button
                  type="button"
                  onClick={() => void loadReviews(reviewPage + 1, "append")}
                  disabled={reviewsLoading}
                  className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] disabled:opacity-70"
                >
                  {reviewsLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                  Carregar mais
                </button>
              ) : null}
            </div>

            <aside className="hidden rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--panel-shadow)] backdrop-blur-xl xl:sticky xl:top-36 xl:block xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
              {reviewDetail ?? <EmptyState>Escolha uma avaliação na lista para ver os detalhes.</EmptyState>}
            </aside>
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)] xl:items-start">
            <div className="grid gap-3">
              <SearchField value={userQuery} onChange={setUserQuery} placeholder="Buscar por nome, login ou casal" />

              {usersLoading && users.length === 0 ? <LoadingRows /> : null}
              {!usersLoading && users.length === 0 ? <EmptyState>Nenhum usuário encontrado.</EmptyState> : null}

              {users.map((user) => {
                const isSelected = selectedUser?.id === user.id;
                const pairChanged = (editedPairs[user.id] ?? "") !== (user.id_casal ?? "");

                return (
                  <article
                    key={user.id}
                    className={clsx(
                      "grid gap-3 rounded-[20px] border bg-[var(--panel)] p-4",
                      isSelected ? "border-[var(--accent-soft)]" : "border-[var(--panel-border)]"
                    )}
                  >
                    <button type="button" onClick={() => openUser(user)} className="flex items-center gap-3 text-left">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--accent-glass)] text-sm font-bold uppercase text-[var(--accent-soft)]">
                        {user.name.slice(0, 1)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex flex-wrap items-center gap-1.5">
                          <span className="truncate font-bold">{user.name}</span>
                          <Chip tone={user.role === 2 ? "accent" : "neutral"}>{ROLE_LABELS[user.role] ?? `Nível ${user.role}`}</Chip>
                        </span>
                        <span className="mt-0.5 block truncate text-sm text-[var(--muted-strong)]">
                          {user.login ? `@${user.login}` : user.email ?? "Sem login"}
                        </span>
                      </span>
                      <span className="hidden shrink-0 text-xs font-semibold text-[var(--accent-soft)] sm:inline">Ver avaliações</span>
                      <ChevronRight className="h-4 w-4 shrink-0 text-[var(--muted)]" />
                    </button>

                    <div className="flex items-end gap-2">
                      <label className="grid min-w-0 flex-1 gap-1">
                        <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">Casal</span>
                        <input
                          value={editedPairs[user.id] ?? ""}
                          onChange={(event) => setEditedPairs((current) => ({ ...current, [user.id]: event.target.value }))}
                          className="w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm outline-none focus:border-[var(--accent-soft)]"
                          placeholder="sem vínculo"
                          autoCapitalize="none"
                        />
                      </label>
                      {pairChanged ? (
                        <button
                          type="button"
                          onClick={() => void handleUserSave(user.id)}
                          disabled={savingUserId === user.id}
                          className="btn-primary h-[38px] shrink-0 rounded-xl px-4 text-sm font-semibold disabled:opacity-70"
                        >
                          {savingUserId === user.id ? "..." : "Salvar"}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteUserId(user.id)}
                        className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl border border-[var(--field-border)] text-[var(--muted-strong)] hover:border-[var(--danger-border)] hover:bg-[var(--danger-bg)] hover:text-[var(--danger-text)]"
                        aria-label={`Excluir ${user.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {confirmDeleteUserId === user.id ? (
                      <div className="animate-fade-up grid gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
                        <p className="text-sm text-[var(--danger-text)]">
                          Excluir <strong>{user.name}</strong>? As avaliações dele vão para a lixeira.
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteUserId(null)}
                            className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            disabled={deletingUserId === user.id}
                            onClick={() => void handleDeleteUser(user)}
                            className="btn-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70"
                          >
                            {deletingUserId === user.id ? "Excluindo..." : "Excluir"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <aside className="hidden rounded-[24px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--panel-shadow)] backdrop-blur-xl xl:sticky xl:top-36 xl:block xl:max-h-[calc(100vh-10rem)] xl:overflow-y-auto">
              {selectedUser ? (
                <>
                  <h2 className="mb-3 text-lg font-bold">Avaliações de {selectedUser.name}</h2>
                  {userReviewsPanel}
                </>
              ) : (
                <EmptyState>Escolha um usuário para ver as avaliações do casal.</EmptyState>
              )}
            </aside>
          </div>
        )}
      </div>

      <MobileSheet isOpen={userSheet.isOpen} title={selectedUser ? `Avaliações de ${selectedUser.name}` : "Usuário"} onClose={userSheet.close}>
        {userReviewsPanel}
      </MobileSheet>

      <MobileSheet isOpen={reviewSheet.isOpen} title={selectedReview?.placeName ?? "Avaliação"} onClose={reviewSheet.close}>
        {reviewDetail}
      </MobileSheet>

      {feedback ? (
        <div className="safe-bottom pointer-events-none fixed inset-x-0 z-[130] flex justify-center px-4">
        <div
          role="status"
          className={clsx(
            "animate-pop-in w-full max-w-[420px] rounded-2xl border px-4 py-3 text-sm font-medium shadow-[var(--hero-shadow)] backdrop-blur-xl",
            feedback.tone === "success"
              ? "border-[var(--success-border)] bg-[color-mix(in_srgb,var(--panel-solid)_90%,transparent)] text-[var(--success-text)]"
              : "border-[var(--danger-border)] bg-[color-mix(in_srgb,var(--panel-solid)_90%,transparent)] text-[var(--danger-text)]"
          )}
        >
          {feedback.text}
        </div>
        </div>
      ) : null}
    </main>
  );
}
