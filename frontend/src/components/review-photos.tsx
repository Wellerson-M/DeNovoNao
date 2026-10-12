"use client";

import { MouseEvent, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ChevronLeft, ChevronRight, ImageIcon, X } from "lucide-react";
import { photoUrl } from "@/lib/photos";
import type { ReviewPhoto } from "@/lib/types";

/** Miniaturas pequenas no card; tocar abre a foto em tela cheia. */
export function ReviewPhotos({
  photos,
  pendingCount = 0,
  className = "mt-4",
}: {
  photos: ReviewPhoto[];
  pendingCount?: number;
  className?: string;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const isClosingRef = useRef(false);

  // Fecha voltando UMA entrada no histórico (a que foi criada ao abrir). O toque no "X"
  // também chegava ao fundo escuro e voltava duas vezes, saindo da página de trás.
  const close = useCallback((event?: MouseEvent) => {
    event?.stopPropagation();
    if (isClosingRef.current) {
      return;
    }
    isClosingRef.current = true;
    window.history.back();
  }, []);
  const step = useCallback(
    (delta: number) =>
      setOpenIndex((current) => (current === null ? null : (current + delta + photos.length) % photos.length)),
    [photos.length],
  );

  useEffect(() => {
    if (openIndex === null) {
      return;
    }

    // O "voltar" do celular fecha a foto em vez de sair da página.
    // Mantém o estado atual (ex.: telas abertas no painel admin) para não fechá-las junto.
    isClosingRef.current = false;
    window.history.pushState({ ...window.history.state, photoViewer: true }, "");
    const handlePop = () => setOpenIndex(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key === "ArrowRight") step(1);
      if (event.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("popstate", handlePop);
    window.addEventListener("keydown", handleKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("popstate", handlePop);
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
    // Reabre o efeito só ao abrir/fechar, não ao trocar de foto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openIndex === null]);

  if (photos.length === 0 && pendingCount === 0) {
    return null;
  }

  const current = openIndex === null ? null : photos[openIndex];

  return (
    <>
      <div className={clsx("flex flex-wrap items-center gap-2", className)}>
        {photos.map((photo, index) => (
          <button
            key={photo.publicId}
            type="button"
            onClick={() => setOpenIndex(index)}
            aria-label={`Ver foto ${index + 1} de ${photos.length}`}
            className="h-14 w-14 overflow-hidden rounded-xl border border-[var(--field-border)] transition hover:opacity-85"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoUrl(photo, "thumb")} alt="" loading="lazy" className="h-full w-full object-cover" />
          </button>
        ))}
        {pendingCount > 0 ? (
          <span className="inline-flex items-center gap-1 text-xs text-[var(--muted)]">
            <ImageIcon className="h-3.5 w-3.5" />
            {pendingCount === 1 ? "1 foto aguardando envio" : `${pendingCount} fotos aguardando envio`}
          </span>
        ) : null}
      </div>

      {/* Portal: o card tem blur/animação, que prenderiam o "fixed" dentro dele. */}
      {current
        ? createPortal(
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Foto da avaliação"
              className="fixed inset-0 z-[140] flex items-center justify-center bg-black/90 p-4"
              onClick={close}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photoUrl(current, "full")}
                alt=""
                className="max-h-[85vh] max-w-full rounded-xl object-contain"
                onClick={(event) => event.stopPropagation()}
              />

              <button
                type="button"
                onClick={close}
                aria-label="Fechar"
                className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/15 text-white"
              >
                <X className="h-5 w-5" />
              </button>

              {photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      step(-1);
                    }}
                    aria-label="Foto anterior"
                    className="absolute left-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      step(1);
                    }}
                    aria-label="Próxima foto"
                    className="absolute right-3 top-1/2 inline-flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/15 text-white"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <p className="absolute bottom-4 left-1/2 -translate-x-1/2 text-sm text-white/80">
                    {(openIndex ?? 0) + 1} / {photos.length}
                  </p>
                </>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
