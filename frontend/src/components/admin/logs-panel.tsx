"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, LoaderCircle, UserRound } from "lucide-react";
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

function LogRow({ log }: { log: AuditLogEntry }) {
  const who = log.actorName || log.actorLogin || "Alguém";
  const details = describeDetails(log.details);
  const tone = ACTION_TONES[log.action] ?? "neutral";

  return (
    <article className="grid gap-1.5 rounded-[18px] border border-[var(--panel-border)] bg-[var(--panel)] p-3.5">
      <div className="flex flex-wrap items-center gap-2">
        <Chip tone={tone}>{describeAction(log.action)}</Chip>
        <span className="text-xs text-[var(--muted)] tabular-nums">{formatMoment(log.createdAt)}</span>
      </div>

      <p className="text-sm text-[var(--text-soft)]">
        <span className="inline-flex items-center gap-1 font-semibold text-[var(--text)]">
          <UserRound className="h-3.5 w-3.5" />
          {who}
          {log.actorRole === 2 ? <span className="text-[var(--accent-soft)]">(admin)</span> : null}
        </span>
        {log.targetLabel && log.targetLabel !== who ? (
          <span className="text-[var(--muted-strong)]"> · {log.targetLabel}</span>
        ) : null}
      </p>

      {details ? <p className="text-xs text-[var(--muted)]">{details}</p> : null}
      {log.ip ? <p className="text-[11px] text-[var(--muted)] tabular-nums">IP {log.ip}</p> : null}
    </article>
  );
}

export function LogsPanel({
  token,
  notify,
  initialFilter = "all",
}: {
  token: string;
  notify: (tone: "success" | "error", text: string) => void;
  initialFilter?: string;
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
        <LogRow key={log.id} log={log} />
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
