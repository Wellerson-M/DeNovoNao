"use client";

import { FormEvent, useState } from "react";
import clsx from "clsx";
import { ReviewInput } from "@/lib/types";

const initialForm: ReviewInput = {
  placeName: "",
  locationLabel: "",
  coupleRating: 4,
  myOpinion: "",
  herOpinion: "",
  redFlags: [],
  visitedAt: new Date().toISOString().slice(0, 10),
};

type ReviewFormProps = {
  onSubmit: (value: ReviewInput) => Promise<{ mode: "online" | "offline" }>;
};

export function ReviewForm({ onSubmit }: ReviewFormProps) {
  const [form, setForm] = useState<ReviewInput>(initialForm);
  const [redFlagsText, setRedFlagsText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await onSubmit({
        ...form,
        visitedAt: new Date(form.visitedAt).toISOString(),
        redFlags: redFlagsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      setMessage(
        result.mode === "online"
          ? "Avaliacao salva e sincronizada."
          : "Sem internet. Avaliacao guardada para sincronizar depois."
      );
      setForm(initialForm);
      setRedFlagsText("");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `Nao foi possivel salvar agora. ${error.message}`
          : "Nao foi possivel salvar agora. Tente novamente."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-5 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-xl">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Nome do lugar</span>
          <input
            required
            value={form.placeName}
            onChange={(event) => setForm((current) => ({ ...current, placeName: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="Ex: Smash do Centro"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Bairro / cidade</span>
          <input
            required
            value={form.locationLabel}
            onChange={(event) => setForm((current) => ({ ...current, locationLabel: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="Ex: Centro, Joinville"
          />
        </label>
      </div>

      <div className="grid gap-2">
        <span className="text-sm text-[var(--muted-strong)]">Nota geral</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((current) => ({ ...current, coupleRating: value }))}
              className={clsx(
                "rounded-2xl border px-3 py-3 text-sm font-medium shadow-sm hover:-translate-y-0.5 focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-ring)]",
                form.coupleRating === value
                  ? "border-[var(--accent-soft)] bg-[var(--accent)] text-white shadow-[0_10px_30px_rgba(124,1,22,0.24)]"
                  : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--text-soft)] hover:border-[var(--accent-soft)]/70 hover:bg-[var(--field-bg-strong)]"
              )}
            >
              {value} estrela{value > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Opinião 1</span>
          <textarea
            rows={4}
            value={form.myOpinion}
            onChange={(event) => setForm((current) => ({ ...current, myOpinion: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="O que a primeira pessoa achou?"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Opinião 2</span>
          <textarea
            rows={4}
            value={form.herOpinion}
            onChange={(event) => setForm((current) => ({ ...current, herOpinion: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="O que a segunda pessoa achou?"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Red flags / observações</span>
          <input
            value={redFlagsText}
            onChange={(event) => setRedFlagsText(event.target.value)}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="Separe por virgula"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Data</span>
          <input
            type="date"
            required
            value={form.visitedAt}
            onChange={(event) => setForm((current) => ({ ...current, visitedAt: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          disabled={isSubmitting}
          className="rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,1,22,0.22)] hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:shadow-[0_0_0_4px_var(--accent-ring)] disabled:opacity-70"
        >
          {isSubmitting ? "Salvando..." : "Salvar avaliacao"}
        </button>

        {message ? <p className="text-sm text-[var(--muted-strong)]">{message}</p> : null}
      </div>
    </form>
  );
}
