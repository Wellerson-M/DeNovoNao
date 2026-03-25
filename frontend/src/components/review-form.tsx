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
    <form onSubmit={handleSubmit} className="grid gap-4 rounded-[28px] border border-[#ffffff12] bg-[#ffffff08] p-4 shadow-glow">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-sm text-[#e6cfcf]">Nome da lanchonete</span>
          <input
            required
            value={form.placeName}
            onChange={(event) => setForm((current) => ({ ...current, placeName: event.target.value }))}
            className="rounded-2xl border border-[#ffffff14] bg-[#14070b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9e7f83] focus:border-[#a31a31] focus:shadow-[0_0_0_3px_rgba(163,26,49,0.2)]"
            placeholder="Ex: Smash do Centro"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[#e6cfcf]">Local</span>
          <input
            required
            value={form.locationLabel}
            onChange={(event) => setForm((current) => ({ ...current, locationLabel: event.target.value }))}
            className="rounded-2xl border border-[#ffffff14] bg-[#14070b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9e7f83] focus:border-[#a31a31] focus:shadow-[0_0_0_3px_rgba(163,26,49,0.2)]"
            placeholder="Ex: Mooca, Sao Paulo"
          />
        </label>
      </div>

      <div className="grid gap-2">
        <span className="text-sm text-[#e6cfcf]">Nota geral do casal</span>
        <div className="grid grid-cols-5 gap-2">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((current) => ({ ...current, coupleRating: value }))}
              className={clsx(
                "rounded-2xl border px-3 py-3 text-sm font-medium shadow-sm hover:-translate-y-0.5 focus:outline-none focus:shadow-[0_0_0_3px_rgba(163,26,49,0.25)]",
                form.coupleRating === value
                  ? "border-[#d36375] bg-[#7c0116] text-white shadow-[0_10px_30px_rgba(124,1,22,0.28)]"
                  : "border-[#ffffff12] bg-[#1a0a0f] text-[#dbc0c2] hover:border-[#a31a31]/70 hover:bg-[#240c13]"
              )}
            >
              {value} estrela{value > 1 ? "s" : ""}
            </button>
          ))}
        </div>
      </div>

      <label className="grid gap-2">
        <span className="text-sm text-[#e6cfcf]">Minha opiniao</span>
        <textarea
          rows={4}
          value={form.myOpinion}
          onChange={(event) => setForm((current) => ({ ...current, myOpinion: event.target.value }))}
          className="rounded-2xl border border-[#ffffff14] bg-[#14070b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9e7f83] focus:border-[#a31a31] focus:shadow-[0_0_0_3px_rgba(163,26,49,0.2)]"
          placeholder="O que voce achou?"
        />
      </label>

      <label className="grid gap-2">
        <span className="text-sm text-[#e6cfcf]">Opiniao dela</span>
        <textarea
          rows={4}
          value={form.herOpinion}
          onChange={(event) => setForm((current) => ({ ...current, herOpinion: event.target.value }))}
          className="rounded-2xl border border-[#ffffff14] bg-[#14070b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9e7f83] focus:border-[#a31a31] focus:shadow-[0_0_0_3px_rgba(163,26,49,0.2)]"
          placeholder="O que ela achou?"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
        <label className="grid gap-2">
          <span className="text-sm text-[#e6cfcf]">Avisos criticos / red flags</span>
          <input
            value={redFlagsText}
            onChange={(event) => setRedFlagsText(event.target.value)}
            className="rounded-2xl border border-[#ffffff14] bg-[#14070b] px-4 py-3 text-sm text-white outline-none placeholder:text-[#9e7f83] focus:border-[#a31a31] focus:shadow-[0_0_0_3px_rgba(163,26,49,0.2)]"
            placeholder="Separe por virgula"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm text-[#e6cfcf]">Data da visita</span>
          <input
            type="date"
            required
            value={form.visitedAt}
            onChange={(event) => setForm((current) => ({ ...current, visitedAt: event.target.value }))}
            className="rounded-2xl border border-[#ffffff14] bg-[#14070b] px-4 py-3 text-sm text-white outline-none focus:border-[#a31a31] focus:shadow-[0_0_0_3px_rgba(163,26,49,0.2)]"
          />
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          disabled={isSubmitting}
          className="rounded-full border border-[#d36375] bg-gradient-to-r from-[#7c0116] via-[#951427] to-[#b3293d] px-5 py-3 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(124,1,22,0.32)] hover:-translate-y-0.5 hover:brightness-110 focus:outline-none focus:shadow-[0_0_0_4px_rgba(163,26,49,0.28)] disabled:opacity-70"
        >
          {isSubmitting ? "Salvando..." : "Salvar avaliacao"}
        </button>

        {message ? <p className="text-sm text-[#d8bdbf]">{message}</p> : null}
      </div>
    </form>
  );
}
