"use client";

import { useState } from "react";
import clsx from "clsx";
import { Copy, KeyRound, LoaderCircle, LogOut, PauseCircle, PlayCircle } from "lucide-react";
import { createResetLink, revokeUserSessions, updateAdminUser } from "@/lib/api/admin";
import type { UserRecord } from "@/lib/types";

type Confirmable = "suspend" | "reactivate" | "revoke" | null;

export function UserActions({
  user,
  token,
  notify,
  onUpdated,
}: {
  user: UserRecord;
  token: string;
  notify: (tone: "success" | "error", text: string) => void;
  onUpdated: (user: UserRecord) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Confirmable>(null);
  const [resetLink, setResetLink] = useState<string | null>(null);
  const isSuspended = user.active === false;

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key);
    try {
      await task();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível concluir");
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  const toggleSuspension = () =>
    run("suspend", async () => {
      const updated = await updateAdminUser(user.id, { active: isSuspended }, token);
      onUpdated(updated);
      notify("success", isSuspended ? `${user.name} voltou a ter acesso.` : `${user.name} foi suspenso e saiu de todos os aparelhos.`);
    });

  const revoke = () =>
    run("revoke", async () => {
      await revokeUserSessions(token, user.id);
      notify("success", `${user.name} terá que entrar de novo em todos os aparelhos.`);
    });

  const generateLink = () =>
    run("reset", async () => {
      const result = await createResetLink(token, user.id);
      setResetLink(result.url);

      try {
        await navigator.clipboard.writeText(result.url);
        notify("success", `Link copiado. Vale por ${result.expiresInHours}h e serve uma vez só.`);
      } catch {
        notify("success", `Link gerado. Vale por ${result.expiresInHours}h e serve uma vez só.`);
      }
    });

  const actionClass =
    "inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-xs font-semibold text-[var(--text-soft)] hover:border-[var(--accent-soft)] disabled:opacity-60";

  return (
    <div className="grid gap-2 border-t border-[var(--panel-border)] pt-3">
      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          disabled={busy !== null}
          onClick={() => setConfirming(isSuspended ? "reactivate" : "suspend")}
          className={clsx(actionClass, isSuspended && "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]")}
        >
          {busy === "suspend" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : isSuspended ? (
            <PlayCircle className="h-3.5 w-3.5" />
          ) : (
            <PauseCircle className="h-3.5 w-3.5" />
          )}
          {isSuspended ? "Reativar" : "Suspender"}
        </button>

        <button type="button" disabled={busy !== null} onClick={() => setConfirming("revoke")} className={actionClass}>
          {busy === "revoke" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <LogOut className="h-3.5 w-3.5" />}
          Sair de tudo
        </button>

        <button type="button" disabled={busy !== null} onClick={() => void generateLink()} className={actionClass}>
          {busy === "reset" ? <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> : <KeyRound className="h-3.5 w-3.5" />}
          Nova senha
        </button>
      </div>

      {confirming ? (
        <div className="animate-fade-up grid gap-3 rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] p-3">
          <p className="text-sm text-[var(--danger-text)]">
            {confirming === "suspend"
              ? `Suspender ${user.name}? A conta perde o acesso na hora, mas as avaliações continuam no ar.`
              : confirming === "reactivate"
                ? `Devolver o acesso de ${user.name}?`
                : `Encerrar as sessões de ${user.name} em todos os aparelhos?`}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirming(null)}
              className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm font-semibold text-[var(--text-soft)]"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => void (confirming === "revoke" ? revoke() : toggleSuspension())}
              className="btn-primary rounded-full px-4 py-2 text-sm font-semibold disabled:opacity-70"
            >
              Confirmar
            </button>
          </div>
        </div>
      ) : null}

      {resetLink ? (
        <div className="animate-fade-up grid gap-2 rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-glass)] p-3">
          <p className="text-xs font-semibold text-[var(--accent-soft)]">Mande este link para {user.name} (vale 24h, uma vez só):</p>
          <p className="break-all rounded-xl bg-[var(--field-bg)] p-2 text-[11px] text-[var(--text-soft)]">{resetLink}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(resetLink).then(
                  () => notify("success", "Link copiado."),
                  () => notify("error", "Copie o link manualmente.")
                );
              }}
              className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-xs font-semibold text-[var(--text-soft)]"
            >
              <Copy className="h-3.5 w-3.5" />
              Copiar
            </button>
            <button
              type="button"
              onClick={() => setResetLink(null)}
              className="rounded-full px-4 py-2 text-xs font-semibold text-[var(--muted-strong)]"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
