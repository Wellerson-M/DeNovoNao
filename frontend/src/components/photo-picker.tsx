"use client";

import { ChangeEvent, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { MAX_PHOTOS } from "@/lib/photos";

export type PickerPhoto = { key: string; src: string };

/** Linha discreta de miniaturas com um "+" para anexar. A foto é um extra da avaliação. */
export function PhotoPicker({
  photos,
  onAdd,
  onRemove,
  disabled,
}: {
  photos: PickerPhoto[];
  onAdd: (files: File[]) => Promise<void>;
  onRemove: (key: string) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const remaining = MAX_PHOTOS - photos.length;

  async function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []).slice(0, remaining);
    // Limpa para poder escolher a mesma foto de novo depois de removê-la.
    event.target.value = "";
    if (files.length === 0) {
      return;
    }

    setIsPreparing(true);
    try {
      await onAdd(files);
    } finally {
      setIsPreparing(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {photos.map((photo) => (
        <div
          key={photo.key}
          className="relative h-16 w-16 overflow-hidden rounded-xl border border-[var(--field-border)]"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photo.src} alt="" className="h-full w-full object-cover" />
          <button
            type="button"
            disabled={disabled}
            onClick={() => onRemove(photo.key)}
            aria-label="Remover foto"
            className="absolute right-0.5 top-0.5 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}

      {remaining > 0 ? (
        <button
          type="button"
          disabled={disabled || isPreparing}
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-[var(--field-border)] text-[var(--muted)] hover:border-[var(--accent-soft)] hover:text-[var(--accent-soft)] disabled:opacity-50"
          aria-label="Adicionar fotos"
        >
          <ImagePlus className="h-5 w-5" />
          <span className="text-[10px] font-medium">{isPreparing ? "..." : `${photos.length}/${MAX_PHOTOS}`}</span>
        </button>
      ) : null}

      <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleChange} />
    </div>
  );
}
