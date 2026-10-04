"use client";

import clsx from "clsx";
import { Search, X } from "lucide-react";

export function Chip({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "danger" | "accent" | "success" | "warning";
  children: React.ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
        tone === "neutral" && "border-[var(--field-border)] text-[var(--muted-strong)]",
        tone === "danger" && "border-[var(--danger-border)] bg-[var(--danger-bg)] text-[var(--danger-text)]",
        tone === "accent" && "border-transparent bg-[var(--accent-glass)] text-[var(--accent-soft)]",
        tone === "success" && "border-[var(--success-border)] bg-[var(--success-bg)] text-[var(--success-text)]",
        tone === "warning" && "border-[var(--rating-mid-bg)] bg-[var(--rating-mid-bg)] text-[var(--rating-mid-text)]"
      )}
    >
      {children}
    </span>
  );
}

export function SearchField({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-3 rounded-[18px] border border-[var(--field-border)] bg-[var(--field-bg-strong)] px-4 py-3 focus-within:border-[var(--accent-soft)] focus-within:shadow-[0_0_0_3px_var(--accent-ring)]">
      <Search className="h-4 w-4 shrink-0 text-[var(--muted)]" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        enterKeyHint="search"
        className="w-full min-w-0 bg-transparent text-sm text-[var(--text)] outline-none placeholder:text-[var(--muted)] [&::-webkit-search-cancel-button]:hidden"
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange("")}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--panel-hover)] text-[var(--muted-strong)]"
          aria-label="Limpar busca"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </label>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-[20px] border border-dashed border-[var(--field-border)] px-4 py-8 text-center text-sm text-[var(--muted-strong)]">
      {children}
    </div>
  );
}

export function LoadingRows({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-3" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="skeleton h-20 rounded-[20px]" />
      ))}
    </div>
  );
}

/** Linha de botões que rolam na horizontal no celular. */
export function FilterRow({
  options,
  value,
  onChange,
  label,
}: {
  options: ReadonlyArray<{ value: string; label: string }>;
  value: string;
  onChange: (value: string) => void;
  label: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [scrollbar-width:none]" role="group" aria-label={label}>
      <div className="flex min-w-max items-center gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={value === option.value}
            className={clsx(
              "h-9 shrink-0 rounded-full border px-3.5 text-sm font-semibold",
              value === option.value
                ? "btn-primary border-transparent"
                : "border-[var(--field-border)] bg-[var(--field-bg)] text-[var(--muted-strong)] hover:border-[var(--accent-soft)]"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
