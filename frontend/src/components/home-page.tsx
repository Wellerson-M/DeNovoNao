"use client";

import { useState } from "react";
import { Search, Wifi, WifiOff, AlertTriangle, MapPin, Star, RefreshCcw, ChevronDown, Plus } from "lucide-react";
import { ReviewForm } from "@/components/review-form";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { useReviews } from "@/hooks/use-reviews";

function Stars({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-1 text-amber-500">
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          className={`h-4 w-4 ${index < value ? "fill-current" : ""}`}
        />
      ))}
    </div>
  );
}

export function HomePage() {
  const isOnline = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const { reviews, isLoading, error, reload, createOrQueueReview } = useReviews(query, isOnline);

  return (
    <main className="min-h-screen bg-stone-950 text-stone-50">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-[28px] border border-[#ffffff12] bg-gradient-to-br from-[#7c0116] via-[#991528] to-[#c64050] p-[1px] shadow-2xl shadow-[#7c0116]/30">
          <div className="rounded-[27px] bg-[#14070b]/95 p-5 backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[#f4c6cb]/80">
                  Avalieitor
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  Diario do casal foodie
                </h1>
                <p className="mt-2 max-w-xl text-sm text-[#e3c7ca]">
                  Guardem os lugares incriveis, os arrependimentos e os avisos que merecem ser lembrados.
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <label className="flex items-center gap-3 rounded-2xl border border-[#ffffff12] bg-[#ffffff08] px-4 py-3 sm:min-w-[360px]">
                <Search className="h-4 w-4 text-[#af8e94]" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Buscar lanchonete, bairro ou red flag"
                  className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[#9e7f83]"
                />
              </label>

              <div className="flex items-center gap-3">
                <div
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
                    isOnline
                      ? "border border-emerald-400/20 bg-emerald-500/12 text-emerald-200"
                      : "border border-[#d36375]/20 bg-[#7c0116]/20 text-[#f0bac1]"
                  }`}
                >
                  {isOnline ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  {isOnline ? "Online" : "Offline"}
                </div>

                <button
                  type="button"
                  onClick={() => void reload()}
                  className="inline-flex items-center gap-2 rounded-full border border-[#ffffff12] bg-[#ffffff08] px-3 py-2 text-xs text-[#ead7d8] hover:-translate-y-0.5 hover:border-[#d36375]/60 hover:bg-[#7c0116]/18 focus:outline-none focus:shadow-[0_0_0_4px_rgba(163,26,49,0.25)]"
                >
                  <RefreshCcw className="h-4 w-4" />
                  Atualizar
                </button>
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-[28px] border border-[#ffffff12] bg-[#ffffff08] shadow-[0_16px_40px_rgba(10,3,5,0.24)] backdrop-blur">
          <button
            type="button"
            onClick={() => setIsComposerOpen((current) => !current)}
            className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left hover:bg-[#ffffff05] focus:outline-none focus:shadow-[inset_0_0_0_1px_rgba(211,99,117,0.45)] sm:px-5"
            aria-expanded={isComposerOpen}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#d36375]/30 bg-[#7c0116]/20 text-[#f7d9dd] shadow-[0_8px_24px_rgba(124,1,22,0.18)]">
                <Plus className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Adicionar avaliacao</p>
                <p className="text-xs text-[#cfaeb2]">
                  Toque para abrir o formulario e registrar um novo lugar
                </p>
              </div>
            </div>

            <ChevronDown
              className={`h-5 w-5 text-[#d7b7bc] transition-transform duration-200 ${
                isComposerOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              isComposerOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-80"
            }`}
          >
            <div className="overflow-hidden">
              <div className="border-t border-[#ffffff10] px-4 pb-4 pt-4 sm:px-5">
                <ReviewForm onSubmit={createOrQueueReview} />
              </div>
            </div>
          </div>
        </section>

        <section className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Ultimas avaliacoes</h2>
            <p className="text-sm text-[#b8959c]">{reviews.length} resultado(s)</p>
          </div>
        </section>

        {error ? (
          <div className="rounded-2xl border border-[#d36375]/20 bg-[#7c0116]/18 px-4 py-3 text-sm text-[#f1c6cc]">
            {error}
          </div>
        ) : null}

        {isLoading ? (
          <div className="rounded-2xl border border-[#ffffff12] bg-[#ffffff08] px-4 py-8 text-center text-sm text-[#d7bfc2]">
            Carregando avaliacoes...
          </div>
        ) : null}

        <div className="grid gap-4">
          {reviews.map((review) => (
            <article
              key={review.id}
              className="rounded-[24px] border border-[#ffffff12] bg-[#ffffff08] p-4 shadow-lg shadow-black/10 backdrop-blur"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{review.placeName}</h3>
                    {review.syncStatus ? (
                      <span className="rounded-full border border-[#d36375]/20 bg-[#7c0116]/18 px-2.5 py-1 text-[11px] font-medium text-[#f1c6cc]">
                        {review.syncStatus === "failed" ? "Falha ao sincronizar" : "Aguardando sincronizacao"}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[#b89aa0]">
                    <MapPin className="h-4 w-4" />
                    <span>{review.locationLabel}</span>
                  </div>

                  <Stars value={review.coupleRating} />
                </div>

                <p className="text-xs text-[#8e7076]">
                  {new Intl.DateTimeFormat("pt-BR", {
                    dateStyle: "medium",
                  }).format(new Date(review.visitedAt))}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-[#12070a] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8e7076]">Minha opiniao</p>
                  <p className="mt-2 text-sm leading-6 text-[#f1e4e4]">{review.myOpinion || "Sem comentario."}</p>
                </div>

                <div className="rounded-2xl bg-[#12070a] p-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-[#8e7076]">Opiniao dela</p>
                  <p className="mt-2 text-sm leading-6 text-[#f1e4e4]">{review.herOpinion || "Sem comentario."}</p>
                </div>
              </div>

              {review.redFlags.length > 0 ? (
                <div className="mt-4 rounded-2xl border border-[#d36375]/20 bg-[#7c0116]/14 p-3">
                  <div className="flex items-center gap-2 text-[#f4c6cb]">
                    <AlertTriangle className="h-4 w-4" />
                    <p className="text-xs uppercase tracking-[0.2em]">Avisos criticos</p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {review.redFlags.map((flag) => (
                      <span
                        key={flag}
                        className="rounded-full border border-[#d36375]/20 bg-[#7c0116]/18 px-3 py-1 text-xs text-[#f7d9dd]"
                      >
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
