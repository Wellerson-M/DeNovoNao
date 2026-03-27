"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { KeyRound, UserPlus, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useConnection } from "@/hooks/use-connection";
import { useUi } from "@/contexts/ui-context";
import { loginUser, registerUser } from "@/lib/api/auth";

type AuthMode = "login" | "register";

export function LoginPage() {
  const router = useRouter();
  const { loginAsVisitor, loginWithToken } = useAuth();
  const { isOnline } = useConnection();
  const { showLoaderFor, withLoader } = useUi();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const headline = useMemo(
    () =>
      mode === "login"
        ? "Entre e continue registrando o que vale e o que não vale repetir."
        : "Crie sua conta e comece a montar o histórico gastronômico do seu jeito.",
    [mode]
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response =
        mode === "login"
          ? await withLoader(loginUser({ email, password }), 520)
          : await withLoader(registerUser({ name, email, password }), 520);

      loginWithToken(response.token);
      showLoaderFor(520);
      router.push("/");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Não foi possível entrar");
    } finally {
      setIsSubmitting(false);
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
              {headline}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-8 text-[var(--text-soft)]">
              Entre com sua conta para registrar e acompanhar suas avaliações
            </p>
          </section>

          <section className="rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel)] p-5 shadow-[var(--panel-shadow)] backdrop-blur-xl sm:p-6">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[var(--accent-soft)]/25 bg-[var(--accent-glass)] text-[var(--accent-contrast)]">
                {mode === "login" ? <KeyRound className="h-5 w-5" /> : <UserPlus className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-[var(--text)]">
                  {mode === "login" ? "Entrar no app" : "Criar conta"}
                </h2>
                <p className="text-sm text-[var(--muted-strong)]">
                  {mode === "login"
                    ? "Use seu email e senha para recuperar a sessão."
                    : "O cadastro já cria um usuário de nível 1 pronto para uso."}
                </p>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] p-1">
              {[
                { key: "login" as const, label: "Entrar" },
                { key: "register" as const, label: "Criar conta" },
              ].map((tab) => (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setMode(tab.key);
                    setError(null);
                  }}
                  className={clsx(
                    "rounded-full px-4 py-2 text-sm font-medium transition",
                    mode === tab.key
                      ? "bg-[var(--accent)] text-white shadow-[0_8px_20px_rgba(124,1,22,0.18)]"
                      : "text-[var(--text-soft)]"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
              {mode === "register" ? (
                <label className="grid gap-2">
                  <span className="text-sm text-[var(--muted-strong)]">Nome</span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                    placeholder="Seu nome"
                    required
                  />
                </label>
              ) : null}

              <label className="grid gap-2">
                <span className="text-sm text-[var(--muted-strong)]">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                  placeholder="voce@exemplo.com"
                  required
                />
              </label>

              <label className="grid gap-2">
                <span className="text-sm text-[var(--muted-strong)]">Senha</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-4 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
                  placeholder="Mínimo de 6 caracteres"
                  required
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
                  disabled={isSubmitting}
                  className="rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,1,22,0.22)] hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {isSubmitting ? "Enviando..." : mode === "login" ? "Entrar" : "Criar conta"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    showLoaderFor(420);
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
