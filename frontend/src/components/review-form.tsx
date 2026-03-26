"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { ReviewInput, ReviewRecord } from "@/lib/types";

const emptyForm: ReviewInput = {
  placeName: "",
  locationLabel: "",
  placeRating: 4,
  opinionOne: "",
  opinionTwo: "",
  criticalWarnings: [],
  isPublic: false,
};

type ReviewFormProps = {
  initialValue?: ReviewRecord | null;
  onCancelEdit?: () => void;
  onSubmit: (value: ReviewInput) => Promise<{ mode: "online" | "offline" } | void>;
};

export function ReviewForm({ initialValue, onCancelEdit, onSubmit }: ReviewFormProps) {
  const [form, setForm] = useState<ReviewInput>(emptyForm);
  const [warningsText, setWarningsText] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialValue) {
      setForm(emptyForm);
      setWarningsText("");
      return;
    }

    setForm({
      placeName: initialValue.placeName,
      locationLabel: initialValue.locationLabel,
      placeRating: initialValue.placeRating,
      opinionOne: initialValue.opinionOne,
      opinionTwo: initialValue.opinionTwo,
      criticalWarnings: initialValue.criticalWarnings,
      isPublic: initialValue.isPublic,
    });
    setWarningsText(initialValue.criticalWarnings.join(", "));
  }, [initialValue]);

  const title = useMemo(() => (initialValue ? "Editar visita" : "Nova visita"), [initialValue]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const result = await onSubmit({
        ...form,
        criticalWarnings: warningsText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      });

      setMessage(
        result?.mode === "offline"
          ? "Sem conexão. A visita foi salva localmente e será sincronizada depois."
          : initialValue
            ? "Visita atualizada com sucesso."
            : "Visita publicada com sucesso."
      );

      if (!initialValue) {
        setForm(emptyForm);
        setWarningsText("");
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? `Não foi possível salvar. ${error.message}` : "Não foi possível salvar."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid gap-5 rounded-[28px] border border-[var(--panel-border)] bg-[var(--panel)] p-4 shadow-[var(--panel-shadow)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-[var(--text)]">{title}</h2>
          <p className="mt-1 text-sm text-[var(--muted-strong)]">
            Registre a visita com impressões, nota e avisos importantes.
          </p>
        </div>

        {initialValue && onCancelEdit ? (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2 text-sm text-[var(--text-soft)] hover:border-[var(--accent-soft)]"
          >
            Cancelar
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Nome do local</span>
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
        <span className="text-sm text-[var(--muted-strong)]">Nota do local</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((current) => ({ ...current, placeRating: value }))}
              className={clsx(
                "rounded-2xl border px-3 py-3 text-sm font-medium shadow-sm hover:-translate-y-0.5 focus:outline-none focus:shadow-[0_0_0_3px_var(--accent-ring)]",
                form.placeRating === value
                  ? "border-[var(--accent-soft)] bg-[var(--accent)] text-white"
                  : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--text-soft)] hover:border-[var(--accent-soft)]/60"
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
            value={form.opinionOne}
            onChange={(event) => setForm((current) => ({ ...current, opinionOne: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="Primeira impressão, sabor, atendimento..."
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[var(--muted-strong)]">Opinião 2</span>
          <textarea
            rows={4}
            value={form.opinionTwo}
            onChange={(event) => setForm((current) => ({ ...current, opinionTwo: event.target.value }))}
            className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
            placeholder="Segunda impressão, consistência, custo-benefício..."
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm text-[var(--muted-strong)]">Avisos críticos / tags</span>
        <input
          value={warningsText}
          onChange={(event) => setWarningsText(event.target.value)}
          className="rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)]"
          placeholder="Ex: maionese ruim, esperar muito, não pedir batata"
        />
      </label>

      <label className="flex items-center justify-between gap-3 rounded-3xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3">
        <div>
          <p className="text-sm font-medium text-[var(--text)]">Visibilidade</p>
          <p className="mt-1 text-xs text-[var(--muted-strong)]">
            Público aparece para todos. Privado fica só para o seu casal.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setForm((current) => ({ ...current, isPublic: !current.isPublic }))}
          className={clsx(
            "relative inline-flex h-8 w-14 items-center rounded-full border transition",
            form.isPublic
              ? "border-[var(--accent-soft)] bg-[var(--accent)]"
              : "border-[var(--field-border)] bg-[var(--field-bg-strong)]"
          )}
        >
          <span
            className={clsx(
              "inline-block h-6 w-6 transform rounded-full bg-white transition",
              form.isPublic ? "translate-x-7" : "translate-x-1"
            )}
          />
        </button>
      </label>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          disabled={isSubmitting}
          className="rounded-full border border-[var(--accent-soft)] bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,1,22,0.22)] hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:shadow-[0_0_0_4px_var(--accent-ring)] disabled:opacity-70"
        >
          {isSubmitting ? "Salvando..." : initialValue ? "Salvar edição" : "Publicar visita"}
        </button>

        {message ? <p className="text-sm text-[var(--muted-strong)]">{message}</p> : null}
      </div>
    </form>
  );
}

