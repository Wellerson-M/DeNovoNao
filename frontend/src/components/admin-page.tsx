"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { CalendarDays, LoaderCircle, Search, ShieldAlert, Trash2, UserRoundCog } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUi } from "@/contexts/ui-context";
import {
  fetchAdminReviews,
  fetchAdminUserReviews,
  fetchAdminUsers,
  updateAdminUser,
} from "@/lib/api/admin";
import { removeReview } from "@/lib/api/reviews";
import type { ReviewRecord, UserRecord } from "@/lib/types";

type AdminTab = "users" | "reviews";

type ModerationGroup = {
  key: string;
  placeName: string;
  locationLabel: string;
  reviews: ReviewRecord[];
};

function formatVisitDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium" }).format(new Date(value));
}

function DetailReviewCard({
  review,
  deletingId,
  onDelete,
}: {
  review: ReviewRecord;
  deletingId: string | null;
  onDelete: (reviewId: string, mode: "soft" | "hard") => Promise<void>;
}) {
  return (
    <article className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <h2 className="text-lg font-semibold">{review.placeName}</h2>
          <p className="text-sm text-[var(--muted-strong)]">{review.locationLabel}</p>
          <p className="text-sm text-[var(--text-soft)]">
            {review.isPublic ? "Pública" : "Privada"} · {review.active ? "Ativa" : "Na lixeira"}
            {review.publisherLabel ? ` · ${review.publisherLabel}` : ""}
          </p>
          <div className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <CalendarDays className="h-4 w-4" />
            Visita em {formatVisitDate(review.visitedAt)}
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void onDelete(review.id, "soft")}
            disabled={deletingId === review.id}
            className="rounded-full border border-[var(--field-border)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--text-soft)] disabled:opacity-70"
          >
            {deletingId === review.id ? "Processando..." : "Soft delete"}
          </button>

          <button
            type="button"
            onClick={() => void onDelete(review.id, "hard")}
            disabled={deletingId === review.id}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-2 text-sm text-[var(--danger-text)] disabled:opacity-70"
          >
            {deletingId === review.id ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
            Hard delete
          </button>
        </div>
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
        <div className="mt-4 rounded-3xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-4 text-sm text-[var(--danger-text)]">
          {review.criticalWarnings.join(" · ")}
        </div>
      ) : null}
    </article>
  );
}

export function AdminPage() {
  const { session } = useAuth();
  const { showLoaderFor } = useUi();
  const [tab, setTab] = useState<AdminTab>("users");
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [reviews, setReviews] = useState<ReviewRecord[]>([]);
  const [userReviews, setUserReviews] = useState<ReviewRecord[]>([]);
  const [editedPairs, setEditedPairs] = useState<Record<string, string>>({});
  const [usersLoading, setUsersLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [userReviewsLoading, setUserReviewsLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reviewPage, setReviewPage] = useState(1);
  const [hasMoreReviews, setHasMoreReviews] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRecord | null>(null);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [expandedModerationGroups, setExpandedModerationGroups] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<string | null>(null);
  const [userQuery, setUserQuery] = useState("");
  const [reviewQuery, setReviewQuery] = useState("");
  const [selectedUserReviewQuery, setSelectedUserReviewQuery] = useState("");
  const detailsRef = useRef<HTMLDivElement | null>(null);

  const tabs = useMemo(
    () => [
      { key: "users" as const, label: "Usuários" },
      { key: "reviews" as const, label: "Moderação" },
    ],
    []
  );

  const adminToken = session?.token ?? "";

  async function loadUsers() {
    if (!adminToken) {
      return;
    }

    setUsersLoading(true);
    try {
      const response = await fetchAdminUsers(adminToken, userQuery);
      setUsers(response.items);
      setEditedPairs(Object.fromEntries(response.items.map((user) => [user.id, user.id_casal ?? ""])));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível carregar usuários");
    } finally {
      setUsersLoading(false);
    }
  }

  async function loadReviews(page = 1, mode: "replace" | "append" = "replace") {
    if (!adminToken) {
      return;
    }

    setReviewsLoading(true);
    try {
      const response = await fetchAdminReviews(adminToken, page, reviewQuery, "alpha");
      setReviewPage(page);
      setHasMoreReviews(response.meta.hasMore);
      setReviews((current) => (mode === "append" ? [...current, ...response.items] : response.items));
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível carregar avaliações");
    } finally {
      setReviewsLoading(false);
    }
  }

  async function loadSelectedUserReviews(user: UserRecord, searchValue = selectedUserReviewQuery) {
    if (!adminToken) {
      return;
    }

    setSelectedUser(user);
    setSelectedReviewId(null);
    setUserReviewsLoading(true);

    try {
      const response = await fetchAdminUserReviews(adminToken, user.id, 1, searchValue);
      setUserReviews(response.items);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível carregar as avaliações do usuário");
    } finally {
      setUserReviewsLoading(false);
    }
  }

  useEffect(() => {
    if (!session || session.role < 2 || tab !== "users") {
      return;
    }

    void loadUsers();
  }, [session, tab, userQuery]);

  useEffect(() => {
    if (!session || session.role < 2 || tab !== "reviews") {
      return;
    }

    void loadReviews(1, "replace");
  }, [session, tab, reviewQuery]);

  async function handleUserSave(userId: string) {
    setSavingUserId(userId);
    setFeedback(null);

    try {
      const updated = await updateAdminUser(
        userId,
        {
          id_casal: editedPairs[userId]?.trim() || null,
        },
        adminToken
      );

      setUsers((current) => current.map((user) => (user.id === userId ? updated : user)));
      setEditedPairs((current) => ({ ...current, [userId]: updated.id_casal ?? "" }));
      setFeedback("id_casal atualizado com sucesso.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setSavingUserId(null);
    }
  }

  async function handleDelete(reviewId: string, mode: "soft" | "hard") {
    setDeletingId(reviewId);
    setFeedback(null);

    try {
      await removeReview(reviewId, adminToken, mode);
      await loadReviews(1, "replace");
      if (selectedUser) {
        await loadSelectedUserReviews(selectedUser);
      }
      setFeedback(mode === "hard" ? "Avaliação removida do servidor." : "Avaliação enviada para a lixeira.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Não foi possível excluir");
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    if (selectedUser) {
      void loadSelectedUserReviews(selectedUser);
    }
  }, [selectedUser?.id, selectedUserReviewQuery]);

  const sortedReviews = useMemo(
    () =>
      [...reviews].sort((a, b) => {
        const placeCompare = a.placeName.localeCompare(b.placeName, "pt-BR");
        if (placeCompare !== 0) {
          return placeCompare;
        }
        return new Date(b.visitedAt).getTime() - new Date(a.visitedAt).getTime();
      }),
    [reviews]
  );

  const moderationGroups = useMemo<ModerationGroup[]>(() => {
    const groups = new Map<string, ModerationGroup>();

    for (const review of sortedReviews) {
      const key = `${review.placeName.toLowerCase()}::${review.locationLabel.toLowerCase()}`;
      const current = groups.get(key);

      if (!current) {
        groups.set(key, {
          key,
          placeName: review.placeName,
          locationLabel: review.locationLabel,
          reviews: [review],
        });
        continue;
      }

      current.reviews.push(review);
    }

    return Array.from(groups.values());
  }, [sortedReviews]);

  useEffect(() => {
    if (!sortedReviews.length) {
      setSelectedReviewId(null);
      return;
    }

    setSelectedReviewId((current) =>
      current && sortedReviews.some((review) => review.id === current) ? current : sortedReviews[0].id
    );
  }, [sortedReviews]);

  useEffect(() => {
    if (!selectedReviewId || !detailsRef.current || typeof window === "undefined") {
      return;
    }

    if (window.innerWidth < 1280) {
      detailsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedReviewId]);

  if (!session || session.role < 2) {
    return (
      <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
        <div className="mx-auto flex min-h-screen max-w-3xl items-center px-4 py-10 sm:px-6">
          <section className="w-full rounded-[32px] border border-[var(--danger-border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">
                <ShieldAlert className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Acesso restrito</h1>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">
                  O painel administrativo é exclusivo para usuários de nível 2.
                </p>
              </div>
            </div>

            <Link href="/" onClick={() => showLoaderFor(420)} className="mt-6 inline-flex rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]">
              Voltar ao feed
            </Link>
          </section>
        </div>
      </main>
    );
  }

  const selectedReview = sortedReviews.find((review) => review.id === selectedReviewId) ?? null;

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <section className="rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">Painel Admin</h1>
              <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
                Gerencie casais, abra o histórico por usuário e modere avaliações com mais contexto.
              </p>
            </div>

            <Link href="/" onClick={() => showLoaderFor(420)} className="inline-flex rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]">
              Voltar ao feed
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] p-1">
            {tabs.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setTab(item.key)}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-medium transition",
                  tab === item.key
                    ? "bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(124,1,22,0.18)]"
                    : "text-[var(--text-soft)]"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {feedback ? (
            <p className="mt-5 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text-soft)]">
              {feedback}
            </p>
          ) : null}

          {tab === "users" ? (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
              <div className="grid gap-4">
                <label className="flex items-center gap-3 rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3">
                  <Search className="h-4 w-4 text-[var(--muted)]" />
                  <input
                    value={userQuery}
                    onChange={(event) => setUserQuery(event.target.value)}
                    placeholder="Buscar usuário por nome, email ou casal"
                    className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                </label>

                {usersLoading ? (
                  <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-8 text-center text-sm text-[var(--muted-strong)]">
                    Carregando usuários...
                  </div>
                ) : null}

                {users.map((user) => (
                  <article key={user.id} className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
                    <div className="flex flex-col gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedUserReviewQuery("");
                          void loadSelectedUserReviews(user, "");
                        }}
                        className="text-left"
                      >
                        <div className="flex items-center gap-2">
                          <UserRoundCog className="h-4 w-4 text-[var(--muted)]" />
                          <h2 className="truncate text-lg font-semibold">{user.name}</h2>
                        </div>
                        <p className="mt-2 text-sm text-[var(--muted-strong)]">{user.email}</p>
                        <p className="mt-2 text-xs uppercase tracking-[0.22em] text-[var(--muted)]">
                          Role {user.role} · casal {user.id_casal ?? "sem vínculo"}
                        </p>
                      </button>

                      <div className="grid gap-3 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end">
                        <label className="grid gap-2">
                          <span className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">id_casal</span>
                          <input
                            value={editedPairs[user.id] ?? ""}
                            onChange={(event) =>
                              setEditedPairs((current) => ({
                                ...current,
                                [user.id]: event.target.value,
                              }))
                            }
                            className="rounded-2xl border border-[var(--field-border)] bg-[var(--panel)] px-4 py-3 text-sm outline-none focus:border-[var(--accent-soft)]"
                            placeholder="Ex: casal-001"
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => void handleUserSave(user.id)}
                          disabled={savingUserId === user.id}
                          className="rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white disabled:opacity-70"
                        >
                          {savingUserId === user.id ? "Salvando..." : "Salvar casal"}
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>

              <div className="grid gap-4 rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedUser ? `Avaliações de ${selectedUser.name}` : "Selecione um usuário"}
                    </h2>
                    <p className="mt-1 text-sm text-[var(--muted-strong)]">
                      {selectedUser
                        ? "As visitas aparecem da mais nova para a mais antiga."
                        : "Clique em um usuário para abrir o histórico dele."}
                    </p>
                  </div>

                  {selectedUser ? (
                    <label className="flex items-center gap-3 rounded-[24px] border border-[var(--field-border)] bg-[var(--panel)] px-4 py-3">
                      <Search className="h-4 w-4 text-[var(--muted)]" />
                      <input
                        value={selectedUserReviewQuery}
                        onChange={(event) => setSelectedUserReviewQuery(event.target.value)}
                        placeholder="Buscar nas avaliações dele"
                        className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                      />
                    </label>
                  ) : null}
                </div>

                {userReviewsLoading ? (
                  <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--panel)] px-4 py-8 text-center text-sm text-[var(--muted-strong)]">
                    Carregando histórico...
                  </div>
                ) : null}

                <div className="grid gap-4">
                  {userReviews.map((review) => (
                    <DetailReviewCard key={review.id} review={review} deletingId={deletingId} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(320px,0.85fr)_minmax(0,1.15fr)]">
              <div className="grid gap-4 xl:max-h-[70vh] xl:overflow-y-auto xl:pr-2">
                <label className="flex items-center gap-3 rounded-[24px] border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3">
                  <Search className="h-4 w-4 text-[var(--muted)]" />
                  <input
                    value={reviewQuery}
                    onChange={(event) => setReviewQuery(event.target.value)}
                    placeholder="Buscar restaurante, opinião, aviso ou estrelas"
                    className="w-full bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                  />
                </label>

                {reviewsLoading && reviews.length === 0 ? (
                  <div className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-8 text-center text-sm text-[var(--muted-strong)]">
                    Carregando avaliações...
                  </div>
                ) : null}

                {moderationGroups.map((group) => (
                  <article key={group.key} className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h2 className="text-lg font-semibold">{group.placeName}</h2>
                        <p className="mt-1 text-sm text-[var(--muted-strong)]">{group.locationLabel}</p>
                        <p className="mt-2 text-xs text-[var(--muted)]">
                          {group.reviews.length} avaliação{group.reviews.length > 1 ? "ões" : ""}
                        </p>
                      </div>

                      {group.reviews.length > 1 ? (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedModerationGroups((current) => ({
                              ...current,
                              [group.key]: !current[group.key],
                            }))
                          }
                          className="rounded-full border border-[var(--field-border)] bg-[var(--panel)] px-4 py-2 text-sm text-[var(--text-soft)]"
                        >
                          {expandedModerationGroups[group.key] ? "Ocultar avaliações" : "Ver avaliações"}
                        </button>
                      ) : null}
                    </div>

                    <div className="mt-4 grid gap-3">
                      {(expandedModerationGroups[group.key] ? group.reviews : [group.reviews[0]]).map((review) => (
                        <button
                          key={review.id}
                          type="button"
                          onClick={() => setSelectedReviewId(review.id)}
                          className={clsx(
                            "rounded-3xl border p-4 text-left transition",
                            selectedReviewId === review.id
                              ? "border-[var(--accent-soft)] bg-[var(--accent-glass)]"
                              : "border-[var(--field-border)] bg-[var(--panel)]"
                          )}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold">
                              {review.createdByName ?? review.publisherLabel ?? "Autor não identificado"}
                            </span>
                            <span className="text-xs text-[var(--muted)]">
                              {review.placeRating} estrela{review.placeRating > 1 ? "s" : ""}
                            </span>
                          </div>
                          <p className="mt-2 text-xs text-[var(--muted)]">
                            {formatVisitDate(review.visitedAt)} · {review.isPublic ? "Pública" : "Privada"}
                          </p>
                        </button>
                      ))}
                    </div>
                  </article>
                ))}

                {hasMoreReviews ? (
                  <button
                    type="button"
                    onClick={() => void loadReviews(reviewPage + 1, "append")}
                    className="mx-auto rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-medium text-[var(--text-soft)]"
                  >
                    Carregar mais avaliações
                  </button>
                ) : null}
              </div>

              <div ref={detailsRef} className="grid gap-4 rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4 xl:sticky xl:top-6 xl:self-start">
                <h2 className="text-lg font-semibold">
                  {selectedReview ? `Detalhes de ${selectedReview.placeName}` : "Selecione uma avaliação"}
                </h2>
                <p className="text-sm text-[var(--muted-strong)]">
                  {selectedReview
                    ? "A moderação fica mais segura quando você vê contexto antes de excluir."
                    : "Clique em uma avaliação da lista para abrir os detalhes completos."}
                </p>

                {selectedReview ? (
                  <DetailReviewCard review={selectedReview} deletingId={deletingId} onDelete={handleDelete} />
                ) : null}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
