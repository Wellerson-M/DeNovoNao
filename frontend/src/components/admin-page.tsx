"use client";

import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function AdminPage() {
  const { session } = useAuth();

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

            <Link
              href="/"
              className="mt-6 inline-flex rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2 text-sm text-[var(--text-soft)]"
            >
              Voltar ao feed
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--page-bg)] text-[var(--text)]">
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <section className="rounded-[32px] border border-[var(--panel-border)] bg-[var(--panel)] p-6 shadow-[var(--panel-shadow)] backdrop-blur-xl">
          <h1 className="text-2xl font-semibold">Painel Admin</h1>
          <p className="mt-3 text-sm leading-7 text-[var(--muted-strong)]">
            A base visual de proteção está pronta. Para concluir gestão de casais e exclusões administrativas, o backend ainda precisa expor endpoints de usuários e uma listagem administrativa de reviews.
          </p>
        </section>
      </div>
    </main>
  );
}

