"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";

export function LoginPage() {
  const router = useRouter();
  const { loginAsVisitor, loginWithToken } = useAuth();
  const { isOnline } = useConnection();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      loginWithToken(token);
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível entrar");
    }
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[36px] border border-[var(--hero-border)] bg-[var(--hero-bg)] p-6 shadow-[var(--hero-shadow)] backdrop-blur-2xl sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <span className="text-xs uppercase tracking-[0.34em] text-[var(--muted)]">DeNovoNao</span>
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs ${
                  isOnline
                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-200"
                    : "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
                }`}
              >
                {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                {isOnline ? "Online" : "Offline"}
              </div>
            </div>

            <h1 className="mt-8 text-4xl font-semibold tracking-tight text-[var(--text)] sm:text-5xl">
              Faça login e continue registrando o que vale — e o que não vale — repetir.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
              Nesta etapa, o login está preparado para receber um JWT já emitido pelo backend. O token define papel, id do casal e libera o feed privado.
            </p>
          </section>

          <section className="rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--panel-shadow)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent-soft)]/25 bg-[var(--accent-glass)] text-[var(--accent-contrast)]">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">Entrar no app</h2>
                <p className="text-sm text-[var(--muted-strong)]">Cole seu JWT para autenticar a sessão.</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              <label className="grid gap-2">
                <span className="text-sm text-[var(--muted-strong)]">JWT</span>
                <textarea
                  rows={7}
                  value={token}
                  onChange={(event) => setToken(event.target.value)}
                  className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                  placeholder="Cole aqui o token JWT"
                />
              </label>

              {error ? (
                <p className="rounded-2xl border border-[var(--danger-border)] bg-[var(--danger-bg)] px-4 py-3 text-sm text-[var(--danger-text)]">
                  {error}
                </p>
              ) : null}

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="submit"
                  className="rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,1,22,0.22)] hover:-translate-y-0.5"
                >
                  Entrar com token
                </button>

                <button
                  type="button"
                  onClick={() => {
                    loginAsVisitor();
                    router.push("/");
                  }}
                  className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-5 py-3 text-sm font-semibold text-[var(--text-soft)] hover:-translate-y-0.5"
                >
                  Continuar como visitante
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

