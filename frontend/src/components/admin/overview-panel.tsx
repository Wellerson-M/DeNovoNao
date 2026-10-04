"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertTriangle, EyeOff, ShieldAlert, Star, Trash2, UserRound, Users } from "lucide-react";
import { fetchAdminOverview, type AdminOverview } from "@/lib/api/admin";
import { EmptyState, LoadingRows } from "@/components/admin/ui";

function Tile({
  icon,
  label,
  value,
  hint,
  tone = "neutral",
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  tone?: "neutral" | "danger" | "warning";
  onClick?: () => void;
}) {
  const Element = onClick ? "button" : "div";

  return (
    <Element
      {...(onClick ? { type: "button" as const, onClick } : {})}
      className={clsx(
        "grid gap-1 rounded-[20px] border bg-[var(--panel)] p-4 text-left",
        tone === "neutral" && "border-[var(--panel-border)]",
        tone === "warning" && "border-[var(--rating-mid-bg)]",
        tone === "danger" && "border-[var(--danger-border)]",
        onClick && "hover:border-[var(--accent-soft)]"
      )}
    >
      <span
        className={clsx(
          "flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em]",
          tone === "danger" ? "text-[var(--danger-text)]" : tone === "warning" ? "text-[var(--rating-mid-text)]" : "text-[var(--muted)]"
        )}
      >
        {icon}
        {label}
      </span>
      <span className="text-3xl font-extrabold tabular-nums">{value}</span>
      {hint ? <span className="text-xs text-[var(--muted-strong)]">{hint}</span> : null}
    </Element>
  );
}

export function OverviewPanel({
  token,
  onError,
  onOpenTrash,
  onOpenLogs,
  refreshKey,
}: {
  token: string;
  onError: (message: string) => void;
  onOpenTrash: () => void;
  onOpenLogs: () => void;
  refreshKey: number;
}) {
  const [data, setData] = useState<AdminOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetchAdminOverview(token)
      .then((response) => {
        if (!cancelled) {
          setData(response);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          onError(error instanceof Error ? error.message : "Não foi possível carregar o resumo");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, refreshKey]);

  if (isLoading && !data) {
    return <LoadingRows count={4} />;
  }

  if (!data) {
    return <EmptyState>Não foi possível carregar o resumo.</EmptyState>;
  }

  return (
    <div className="grid gap-5">
      <section className="grid gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Avaliações</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile icon={<Star className="h-3.5 w-3.5" />} label="No ar" value={data.reviews.active} hint={`${data.reviews.total} no total`} />
          <Tile
            icon={<Trash2 className="h-3.5 w-3.5" />}
            label="Na lixeira"
            value={data.reviews.trashed}
            hint="Toque para abrir"
            tone={data.reviews.trashed > 0 ? "warning" : "neutral"}
            onClick={onOpenTrash}
          />
          <Tile icon={<EyeOff className="h-3.5 w-3.5" />} label="Privadas" value={data.reviews.private} hint="Só o casal vê" />
          <Tile icon={<Star className="h-3.5 w-3.5" />} label="Últimos 7 dias" value={data.reviews.last7Days} hint="Novas visitas" />
        </div>
      </section>

      <section className="grid gap-3">
        <h2 className="text-sm font-bold uppercase tracking-[0.16em] text-[var(--muted)]">Pessoas</h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile icon={<Users className="h-3.5 w-3.5" />} label="Contas" value={data.users.total} />
          <Tile icon={<ShieldAlert className="h-3.5 w-3.5" />} label="Admins" value={data.users.admins} />
          <Tile
            icon={<UserRound className="h-3.5 w-3.5" />}
            label="Sem casal"
            value={data.users.withoutCouple}
            hint={data.users.withoutCouple > 0 ? "Não conseguem publicar" : undefined}
            tone={data.users.withoutCouple > 0 ? "warning" : "neutral"}
          />
          <Tile
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            label="Logins falhos"
            value={data.security.failedLogins7Days}
            hint="Últimos 7 dias"
            tone={data.security.failedLogins7Days > 20 ? "danger" : "neutral"}
            onClick={onOpenLogs}
          />
        </div>
      </section>
    </div>
  );
}
