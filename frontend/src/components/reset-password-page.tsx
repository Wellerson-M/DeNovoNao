"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, ShieldAlert } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { checkResetToken, resetPassword } from "@/lib/api/auth";

type Status = "checking" | "valid" | "invalid" | "done";

const fieldClass =
  "w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]";

export function ResetPasswordPage() {
  const router = useRouter();
  const token = useSearchParams().get("token") ?? "";
  const [status, setStatus] = useState<Status>("checking");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("invalid");
      setError("O link está incompleto. Peça um novo para o administrador.");
      return;
    }

    let cancelled = false;

    checkResetToken(token)
      .then((response) => {
        if (!cancelled) {
          setName(response.name);
          setStatus("valid");
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : "Este link expirou ou já foi usado.");
          setStatus("invalid");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }

    if (password !== confirmation) {
      setError("As duas senhas não são iguais.");
      return;
    }

    setIsSaving(true);

    try {
      await resetPassword(token, password);
      setStatus("done");
      window.setTimeout(() => router.push("/login"), 2500);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível redefinir a senha.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen text-[var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-lg items-center px-4 py-10">
        <section className="w-full rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <Wordmark />

          {status === "checking" ? (
            <p className="mt-6 text-sm text-[var(--muted-strong)]">Conferindo o link...</p>
          ) : null}

          {status === "invalid" ? (
            <div className="mt-6 grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]">
                  <ShieldAlert className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-lg font-bold">Link inválido</h1>
                  <p className="mt-1 text-sm text-[var(--muted-strong)]">{error}</p>
                </div>
              </div>
              <Link href="/login" className="btn-primary inline-flex justify-center rounded-full px-5 py-3 text-sm font-semibold">
                Ir para o login
              </Link>
            </div>
          ) : null}

          {status === "done" ? (
            <div className="mt-6 flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]">
                <CheckCircle2 className="h-5 w-5" />
              </span>
              <div>
                <h1 className="text-lg font-bold">Senha alterada</h1>
                <p className="mt-1 text-sm text-[var(--muted-strong)]">Levando você para o login...</p>
              </div>
            </div>
          ) : null}

          {status === "valid" ? (
            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[var(--accent-glass)] text-[var(--accent-soft)]">
                  <KeyRound className="h-5 w-5" />
                </span>
                <div>
                  <h1 className="text-lg font-bold">Criar senha nova</h1>
                  <p className="text-sm text-[var(--muted-strong)]">Olá, {name}. Escolha uma senha para entrar.</p>
                </div>
              </div>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--muted-strong)]">Nova senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                  placeholder="Mínimo de 6 caracteres"
                  autoComplete="new-password"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm font-medium text-[var(--muted-strong)]">Repita a senha</span>
                <input
                  type="password"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  className={fieldClass}
                  placeholder="A mesma senha de novo"
                  autoComplete="new-password"
                  required
                />
              </label>

              {error ? (
                <p className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
                  {error}
                </p>
              ) : null}

              <button disabled={isSaving} className="btn-primary rounded-full px-5 py-3.5 text-sm font-bold disabled:opacity-70">
                {isSaving ? "Salvando..." : "Salvar senha"}
              </button>

              <p className="text-xs text-[var(--muted)]">
                Ao salvar, as sessões abertas em outros aparelhos são encerradas.
              </p>
            </form>
          ) : null}
        </section>
      </div>
    </main>
  );
}
