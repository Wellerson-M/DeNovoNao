"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import { ChevronRight, Download, LoaderCircle, Star, UserRound } from "lucide-react";
import { downloadLogsCsv, fetchAuditLogs, purgeOldData, type AuditLogEntry } from "@/lib/api/admin";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { Chip, EmptyState, FilterRow, LoadingRows, SearchField } from "@/components/admin/ui";
import { ACTION_FILTERS, ACTION_TONES, describeAction, describeDetails } from "@/components/admin/audit-labels";

const PURGE_PERIODS = [
  { value: 30, label: "30 dias" },
  { value: 90, label: "90 dias" },
  { value: 180, label: "6 meses" },
  { value: 365, label: "1 ano" },
] as const;

function formatMoment(value: string) {
  const date = new Date(value);
  const today = new Date();
  const sameDay = date.toDateString() === today.toDateString();

  return new Intl.DateTimeFormat("pt-BR", {
    ...(sameDay ? {} : { day: "2-digit", month: "short" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatFullMoment(value: string) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "full", timeStyle: "medium" }).format(new Date(value));
}

function LogRow({
  log,
  isOpen,
  onToggle,
  onOpenUser,
  onOpenReview,
  onSearchIp,
}: {
  log: AuditLogEntry;
  isOpen: boolean;
  onToggle: () => void;
  onOpenUser: (search: string) => void;
  onOpenReview: (search: string) => void;
  onSearchIp: (ip: string) => void;
}) {
  const who = log.actorName || log.actorLogin || "Alguém";
  const details = describeDetails(log.details);
  const tone = ACTION_TONES[log.action] ?? "neutral";

  // Quem agiu só é "achável" se tiver conta; login falhado não tem.
  const userSearch = log.actorLogin || log.actorName || "";
  const canOpenUser = Boolean(userSearch) && (log.targetType === "user" || log.actorId);
  const canOpenReview = log.targetType === "review" && Boolean(log.targetLabel);
  const failedLogin = log.action === "auth.login_failed";

  return (
    <article
      className={clsx(
        "overflow-hidden rounded-[18px] border bg-[var(--panel)]",
        isOpen ? "border-[var(--accent-soft)]" : "border-[var(--panel-border)]"
      )}
    >
      <button type="button" onClick={onToggle} className="flex w-full items-start gap-3 p-3.5 text-left hover:bg-[var(--panel-hover)]">
        <span className="min-w-0 flex-1 grid gap-1.5">
          <span className="flex flex-wrap items-center gap-2">
            <Chip tone={tone}>{describeAction(log.action)}</Chip>
            <span className="text-xs text-[var(--muted)] tabular-nums">{formatMoment(log.createdAt)}</span>
          </span>

          <span className="block text-sm text-[var(--text-soft)]">
            <span className="inline-flex items-center gap-1 font-semibold text-[var(--text)]">
              <UserRound className="h-3.5 w-3.5" />
              {who}
              {log.actorRole === 2 ? <span className="text-[var(--accent-soft)]">(admin)</span> : null}
            </span>
            {log.targetLabel && log.targetLabel !== who ? (
              <span className="text-[var(--muted-strong)]"> · {log.targetLabel}</span>
            ) : null}
          </span>

          {details ? <span className="block text-xs text-[var(--muted)]">{details}</span> : null}
        </span>

        <ChevronRight className={clsx("mt-1 h-4 w-4 shrink-0 text-[var(--muted)] transition-transform", isOpen && "rotate-90")} />
      </button>

      {isOpen ? (
        <div className="animate-fade-up grid gap-3 border-t border-[var(--panel-border)] p-3.5">
          <dl className="grid gap-1.5 text-xs">
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[var(--muted)]">Quando</dt>
              <dd className="text-[var(--text-soft)]">{formatFullMoment(log.createdAt)}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[var(--muted)]">Quem</dt>
              <dd className="text-[var(--text-soft)]">
                {who}
                {log.actorLogin ? ` (@${log.actorLogin})` : ""}
              </dd>
            </div>
            {log.targetLabel ? (
              <div className="flex gap-2">
                <dt className="w-20 shrink-0 text-[var(--muted)]">Alvo</dt>
                <dd className="text-[var(--text-soft)]">{log.targetLabel}</dd>
              </div>
            ) : null}
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[var(--muted)]">IP</dt>
              <dd className="tabular-nums text-[var(--text-soft)]">{log.ip || "não registrado"}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-20 shrink-0 text-[var(--muted)]">Ação</dt>
              <dd className="font-mono text-[11px] text-[var(--muted-strong)]">{log.action}</dd>
            </div>
          </dl>

          {failedLogin ? (
            <p className="rounded-xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-2.5 text-xs text-[var(--danger-text)]">
              Tentativa de entrar que não deu certo. Se o login existe e não foi você, gere uma senha nova
              ou suspenda a conta.
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            {canOpenUser ? (
              <button
                type="button"
                onClick={() => onOpenUser(userSearch)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)]"
              >
                <UserRound className="h-3.5 w-3.5" />
                Abrir usuário
              </button>
            ) : null}

            {canOpenReview ? (
              <button
                type="button"
                onClick={() => onOpenReview(log.targetLabel)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)]"
              >
                <Star className="h-3.5 w-3.5" />
                Abrir avaliação
              </button>
            ) : null}

            {log.ip ? (
              <button
                type="button"
                onClick={() => onSearchIp(log.ip)}
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-3.5 py-2 text-xs font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)]"
              >
                Ver tudo deste IP
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </article>
  );
}

export function LogsPanel({
  token,
  notify,
  initialFilter = "all",
  onOpenUser,
  onOpenReview,
}: {
  token: string;
  notify: (tone: "success" | "error", text: string) => void;
  initialFilter?: string;
  onOpenUser: (search: string) => void;
  onOpenReview: (search: string) => void;
}) {
  const [items, setItems] = useState<AuditLogEntry[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [action, setAction] = useState(initialFilter);
  const [purgeDays, setPurgeDays] = useState<number | null>(null);
  const [isPurging, setIsPurging] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [openLogId, setOpenLogId] = useState<string | null>(null);
  const debouncedQuery = useDebouncedValue(query.trim());

  const load = useCallback(
    async (nextPage = 1, mode: "replace" | "append" = "replace") => {
      setIsLoading(true);
      try {
        const response = await fetchAuditLogs(token, nextPage, debouncedQuery, action);
        setPage(nextPage);
        setHasMore(response.meta.hasMore);
        setTotal(response.meta.total);
        setItems((current) => (mode === "append" ? [...current, ...response.items] : response.items));
      } catch (error) {
        notify("error", error instanceof Error ? error.message : "Não foi possível carregar as ocorrências");
      } finally {
        setIsLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token, debouncedQuery, action]
  );

  useEffect(() => {
    void load(1, "replace");
  }, [load]);

  async function handlePurge() {
    if (!purgeDays) {
      return;
    }

    setIsPurging(true);
    try {
      const before = new Date(Date.now() - purgeDays * 24 * 60 * 60 * 1000).toISOString();
      const { removed } = await purgeOldData(token, "logs", before);
      notify("success", removed ? `${removed} ${removed === 1 ? "ocorrência apagada" : "ocorrências apagadas"}.` : "Nada para limpar nesse período.");
      setPurgeDays(null);
      await load(1, "replace");
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível limpar");
    } finally {
      setIsPurging(false);
    }
  }

  return (
    <div className="grid gap-4">
      <SearchField value={query} onChange={setQuery} placeholder="Buscar por pessoa, local ou ação" />
      <FilterRow options={ACTION_FILTERS} value={action} onChange={setAction} label="Filtrar ocorrências" />

      <button
        type="button"
        disabled={isExporting}
        onClick={() => {
          setIsExporting(true);
          downloadLogsCsv(token, query, action)
            .then(() => notify("success", "Arquivo baixado."))
            .catch((error: unknown) => notify("error", error instanceof Error ? error.message : "Não foi possível exportar"))
            .finally(() => setIsExporting(false));
        }}
        className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)] disabled:opacity-70"
      >
        {isExporting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
        Baixar em CSV (com os filtros atuais)
      </button>

      <section className="grid gap-3 rounded-[20px] border border-[var(--panel-border)] bg-[var(--panel)] p-4">
        <div>
          <h2 className="text-sm font-bold">Limpar histórico antigo</h2>
          <p className="mt-0.5 text-xs text-[var(--muted-strong)]">Apaga as ocorrências mais antigas que o período escolhido.</p>
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
              Apagar as ocorrências com mais de <strong>{PURGE_PERIODS.find((item) => item.value === purgeDays)?.label}</strong>?
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
        {total} {total === 1 ? "ocorrência registrada" : "ocorrências registradas"}
      </p>

      {isLoading && items.length === 0 ? <LoadingRows count={5} /> : null}
      {!isLoading && items.length === 0 ? <EmptyState>Nenhuma ocorrência para este filtro.</EmptyState> : null}

      {items.map((log) => (
        <LogRow
          key={log.id}
          log={log}
          isOpen={openLogId === log.id}
          onToggle={() => setOpenLogId((current) => (current === log.id ? null : log.id))}
          onOpenUser={onOpenUser}
          onOpenReview={onOpenReview}
          onSearchIp={(ip) => {
            setQuery(ip);
            setAction("all");
            setOpenLogId(null);
          }}
        />
      ))}

      {hasMore ? (
        <button
          type="button"
          onClick={() => void load(page + 1, "append")}
          disabled={isLoading}
          className="mx-auto inline-flex items-center gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--text-soft)] disabled:opacity-70"
        >
          {isLoading ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
          Carregar mais
        </button>
      ) : null}
    </div>
  );
}
