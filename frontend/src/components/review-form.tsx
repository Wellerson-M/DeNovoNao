"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { Star } from "lucide-react";
import { useUi } from "@/contexts/ui-context";
import type { ReviewInput } from "@/lib/types";

const RATING_LABELS = ["", "Péssimo", "Ruim", "Ok", "Bom", "Excelente"];

function todayLocalIso() {
  const now = new Date();
  const offsetMs = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offsetMs).toISOString().slice(0, 10);
}

function createEmptyForm(): ReviewInput {
  return {
    placeName: "",
    locationLabel: "",
    isDelivery: false,
    placeRating: 4,
    opinionOne: "",
    opinionTwo: "",
    criticalWarnings: [],
    visitedAt: todayLocalIso(),
    isPublic: true,
    priceAmount: null,
    priceNote: "",
  };
}

const fieldClass =
  "w-full rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)] disabled:cursor-not-allowed disabled:opacity-50";

function ToggleRow({
  title,
  description,
  checked,
  onToggle,
}: {
  title: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onToggle}
      className={clsx(
        "flex w-full items-center justify-between gap-4 rounded-2xl border px-4 py-3 text-left",
        checked ? "border-[var(--accent-soft)] bg-[var(--accent-glass)]" : "border-[var(--field-border)] bg-[var(--field-bg)] hover:border-[var(--accent-soft)]"
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-[var(--text)]">{title}</span>
        <span className="mt-0.5 block text-xs text-[var(--muted-strong)]">{description}</span>
      </span>
      <span
        className={clsx(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition",
          checked ? "bg-[image:var(--accent-gradient)]" : "bg-[var(--panel-hover)] ring-1 ring-inset ring-[var(--field-border)]"
        )}
      >
        <span
          className={clsx(
            "inline-block h-5 w-5 rounded-full bg-white shadow transition-transform",
            checked ? "translate-x-6" : "translate-x-1"
          )}
        />
      </span>
    </button>
  );
}

type ReviewFormProps = {
  onSubmit: (value: ReviewInput) => Promise<{ mode: "online" | "offline" } | void>;
};

export function ReviewForm({ onSubmit }: ReviewFormProps) {
  const { withLoader } = useUi();
  const [form, setForm] = useState<ReviewInput>(createEmptyForm);
  const [warningsText, setWarningsText] = useState("");
  const [priceText, setPriceText] = useState("");
  const [message, setMessage] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const messageTimer = useRef<number | null>(null);

  // O aviso não pode ficar preso na tela enquanto a pessoa digita a próxima visita.
  const showMessage = useCallback((next: { tone: "success" | "error"; text: string }) => {
    setMessage(next);
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
    }
    messageTimer.current = window.setTimeout(() => setMessage(null), 6000);
  }, []);

  const clearMessage = useCallback(() => {
    if (messageTimer.current) {
      window.clearTimeout(messageTimer.current);
      messageTimer.current = null;
    }
    setMessage(null);
  }, []);

  useEffect(
    () => () => {
      if (messageTimer.current) {
        window.clearTimeout(messageTimer.current);
      }
    },
    []
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    clearMessage();

    try {
      const result = await withLoader(
        onSubmit({
          ...form,
          placeName: form.placeName.trim(),
          locationLabel: form.locationLabel.trim(),
          opinionOne: form.opinionOne.trim(),
          opinionTwo: form.opinionTwo.trim(),
          priceAmount: priceText.trim() ? Number(priceText.replace(",", ".")) : null,
          criticalWarnings: warningsText
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
        }),
      );

      showMessage({
        tone: "success",
        text:
          result?.mode === "offline"
            ? "Sem conexão. A visita foi salva no aparelho e será enviada quando a internet voltar."
            : "Visita publicada com sucesso.",
      });

      setForm(createEmptyForm());
      setWarningsText("");
      setPriceText("");
    } catch (error) {
      showMessage({
        tone: "error",
        text: error instanceof Error ? `Não foi possível salvar. ${error.message}` : "Não foi possível salvar.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} onInput={clearMessage} className="grid gap-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--muted-strong)]">Nome do local</span>
          <input
            required
            value={form.placeName}
            onChange={(event) => setForm((current) => ({ ...current, placeName: event.target.value }))}
            className={fieldClass}
            placeholder="Ex: Smash do Centro"
            autoComplete="off"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--muted-strong)]">Bairro / cidade</span>
          <input
            required={!form.isDelivery}
            value={form.locationLabel}
            onChange={(event) => setForm((current) => ({ ...current, locationLabel: event.target.value }))}
            disabled={form.isDelivery}
            className={fieldClass}
            placeholder={form.isDelivery ? "Não precisa para delivery" : "Ex: Centro, Joinville"}
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--muted-strong)]">Data da visita</span>
          <input
            required
            type="date"
            value={form.visitedAt}
            max={todayLocalIso()}
            onChange={(event) => setForm((current) => ({ ...current, visitedAt: event.target.value }))}
            className={clsx(fieldClass, "min-h-[46px]")}
          />
        </label>

        <div className="grid content-end">
          <ToggleRow
            title="Delivery"
            description="Pedido em casa, sem endereço do local."
            checked={form.isDelivery}
            onToggle={() =>
              setForm((current) => ({
                ...current,
                isDelivery: !current.isDelivery,
                locationLabel: current.isDelivery ? current.locationLabel : "",
              }))
            }
          />
        </div>
      </div>

      <fieldset className="grid gap-2">
        <legend className="mb-2 text-sm font-medium text-[var(--muted-strong)]">
          Nota do local · <span className="font-semibold text-[var(--text)]">{RATING_LABELS[form.placeRating]}</span>
        </legend>
        <div className="flex items-center gap-1 sm:gap-2" role="radiogroup" aria-label="Nota do local">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={form.placeRating === value}
              aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
              onClick={() => setForm((current) => ({ ...current, placeRating: value }))}
              className="inline-flex h-12 w-12 items-center justify-center rounded-2xl text-[var(--star)] hover:bg-[var(--panel-hover)] sm:h-14 sm:w-14"
            >
              <Star
                key={value === form.placeRating ? `active-${value}` : value}
                className={clsx(
                  "h-8 w-8 sm:h-9 sm:w-9",
                  value <= form.placeRating ? "fill-current" : "opacity-35",
                  value === form.placeRating && "animate-star-pop"
                )}
              />
            </button>
          ))}
        </div>
      </fieldset>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--muted-strong)]">Opinião 1</span>
          <textarea
            rows={4}
            value={form.opinionOne}
            onChange={(event) => setForm((current) => ({ ...current, opinionOne: event.target.value }))}
            className={clsx(fieldClass, "resize-y")}
            placeholder="Sabor, atendimento, preço..."
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-medium text-[var(--muted-strong)]">
            Opinião 2 <span className="font-normal text-[var(--muted)]">(opcional)</span>
          </span>
          <textarea
            rows={4}
            value={form.opinionTwo}
            onChange={(event) => setForm((current) => ({ ...current, opinionTwo: event.target.value }))}
            className={clsx(fieldClass, "resize-y")}
            placeholder="A opinião da outra pessoa, se quiser."
          />
        </label>
      </div>

      <label className="grid gap-2">
        <span className="text-sm font-medium text-[var(--muted-strong)]">Avisos críticos</span>
        <input
          value={warningsText}
          onChange={(event) => setWarningsText(event.target.value)}
          className={fieldClass}
          placeholder="Ex: veio frio, demorou 1h (separe por vírgula)"
        />
      </label>

      <fieldset className="grid gap-3 rounded-2xl border border-[var(--field-border)] bg-[var(--field-bg)] p-4">
        <legend className="px-1 text-sm font-medium text-[var(--muted-strong)]">
          Valor aproximado <span className="font-normal text-[var(--muted)]">(opcional)</span>
        </legend>

        <div className="grid gap-3 sm:grid-cols-[minmax(0,160px)_1fr]">
          <label className="grid gap-1.5">
            <span className="text-xs text-[var(--muted)]">Por pessoa</span>
            <div className="flex items-center gap-2 rounded-xl border border-[var(--field-border)] bg-[var(--panel)] px-3 focus-within:border-[var(--accent-soft)] focus-within:shadow-[0_0_0_3px_var(--accent-ring)]">
              <span className="text-sm font-semibold text-[var(--muted)]">R$</span>
              <input
                inputMode="decimal"
                value={priceText}
                onChange={(event) => setPriceText(event.target.value.replace(/[^0-9.,]/g, ""))}
                className="w-full min-w-0 bg-transparent py-3 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)]"
                placeholder="45"
              />
            </div>
          </label>

          <label className="grid gap-1.5">
            <span className="text-xs text-[var(--muted)]">O que pediu e quanto foi</span>
            <input
              value={form.priceNote}
              onChange={(event) => setForm((current) => ({ ...current, priceNote: event.target.value }))}
              className={clsx(fieldClass, "py-3")}
              placeholder="X-burguer 32, chopp 18"
              maxLength={200}
            />
          </label>
        </div>
      </fieldset>

      <ToggleRow
        title="Privado"
        description="Só você e seu par veem esta avaliação."
        checked={!form.isPublic}
        onToggle={() => setForm((current) => ({ ...current, isPublic: !current.isPublic }))}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          disabled={isSubmitting}
          className="btn-primary w-full rounded-full px-6 py-3.5 text-sm font-bold hover:-translate-y-0.5 disabled:opacity-70 sm:w-auto"
        >
          {isSubmitting ? "Salvando..." : "Publicar visita"}
        </button>

        {message ? (
          <p
            role="status"
            className={clsx(
              "animate-fade-up rounded-2xl border px-4 py-2.5 text-sm",
              message.tone === "success"
                ? "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]"
                : "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]"
            )}
          >
            {message.text}
          </p>
        ) : null}
      </div>
    </form>
  );
}
