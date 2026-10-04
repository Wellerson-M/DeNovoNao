"use client";

import { FormEvent, useState } from "react";
import clsx from "clsx";
import { Star } from "lucide-react";
import { updateReview } from "@/lib/api/reviews";
import type { ReviewRecord } from "@/lib/types";

const fieldClass =
  "w-full rounded-xl border border-[var(--field-border)] bg-[var(--field-bg)] px-3 py-2.5 text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] focus:border-[var(--accent-soft)] focus:shadow-[0_0_0_3px_var(--accent-ring)] disabled:opacity-50";

/** Correção rápida de uma avaliação pelo painel, sem precisar excluir e recriar. */
export function ReviewEditor({
  review,
  token,
  notify,
  onSaved,
  onCancel,
}: {
  review: ReviewRecord;
  token: string;
  notify: (tone: "success" | "error", text: string) => void;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [placeName, setPlaceName] = useState(review.placeName);
  const [locationLabel, setLocationLabel] = useState(review.locationLabel);
  const [placeRating, setPlaceRating] = useState(review.placeRating);
  const [opinionOne, setOpinionOne] = useState(review.opinionOne);
  const [opinionTwo, setOpinionTwo] = useState(review.opinionTwo);
  const [warnings, setWarnings] = useState(review.criticalWarnings.join(", "));
  const [priceText, setPriceText] = useState(review.priceAmount === null ? "" : String(review.priceAmount));
  const [priceNote, setPriceNote] = useState(review.priceNote);
  const [isPublic, setIsPublic] = useState(review.isPublic);
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await updateReview(
        review.id,
        {
          placeName: placeName.trim(),
          locationLabel: locationLabel.trim(),
          placeRating,
          opinionOne: opinionOne.trim(),
          opinionTwo: opinionTwo.trim(),
          criticalWarnings: warnings
            .split(",")
            .map((item) => item.trim())
            .filter(Boolean),
          priceAmount: priceText.trim() ? Number(priceText.replace(",", ".")) : null,
          priceNote: priceNote.trim(),
          isPublic,
        },
        token
      );

      notify("success", `${placeName.trim()} foi atualizada.`);
      onSaved();
    } catch (error) {
      notify("error", error instanceof Error ? error.message : "Não foi possível salvar");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="animate-fade-up grid gap-3 rounded-2xl border border-[var(--accent-soft)] bg-[var(--panel)] p-4">
      <h3 className="text-sm font-bold">Editar avaliação</h3>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Local</span>
        <input value={placeName} onChange={(event) => setPlaceName(event.target.value)} className={fieldClass} required />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">
          {review.isDelivery ? "Delivery (sem endereço)" : "Bairro / cidade"}
        </span>
        <input
          value={locationLabel}
          onChange={(event) => setLocationLabel(event.target.value)}
          className={fieldClass}
          disabled={review.isDelivery}
        />
      </label>

      <div className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Nota</span>
        <div className="flex items-center gap-1" role="radiogroup" aria-label="Nota do local">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={placeRating === value}
              aria-label={`${value} estrela${value > 1 ? "s" : ""}`}
              onClick={() => setPlaceRating(value)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl text-[var(--star)] hover:bg-[var(--panel-hover)]"
            >
              <Star className={clsx("h-6 w-6", value <= placeRating ? "fill-current" : "opacity-35")} />
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Opinião 1</span>
        <textarea rows={3} value={opinionOne} onChange={(event) => setOpinionOne(event.target.value)} className={clsx(fieldClass, "resize-y")} />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Opinião 2</span>
        <textarea rows={3} value={opinionTwo} onChange={(event) => setOpinionTwo(event.target.value)} className={clsx(fieldClass, "resize-y")} />
      </label>

      <label className="grid gap-1.5">
        <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Avisos críticos</span>
        <input value={warnings} onChange={(event) => setWarnings(event.target.value)} className={fieldClass} placeholder="Separe por vírgula" />
      </label>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,130px)_1fr]">
        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Valor (R$)</span>
          <input
            inputMode="decimal"
            value={priceText}
            onChange={(event) => setPriceText(event.target.value.replace(/[^0-9.,]/g, ""))}
            className={fieldClass}
            placeholder="45"
          />
        </label>

        <label className="grid gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--muted)]">Detalhe dos valores</span>
          <input value={priceNote} onChange={(event) => setPriceNote(event.target.value)} className={fieldClass} maxLength={200} />
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-[var(--text-soft)]">
        <input
          type="checkbox"
          checked={!isPublic}
          onChange={(event) => setIsPublic(!event.target.checked)}
          className="h-4 w-4 accent-[var(--accent)]"
        />
        Deixar privada (só o casal vê)
      </label>

      <div className="grid grid-cols-2 gap-2 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full border border-[var(--field-border)] bg-[var(--field-bg)] px-4 py-2.5 text-sm font-semibold text-[var(--text-soft)]"
        >
          Cancelar
        </button>
        <button disabled={isSaving} className="btn-primary rounded-full px-4 py-2.5 text-sm font-semibold disabled:opacity-70">
          {isSaving ? "Salvando..." : "Salvar"}
        </button>
      </div>
    </form>
  );
}
