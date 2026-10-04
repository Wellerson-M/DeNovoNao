import { useId } from "react";
import clsx from "clsx";

// Desenho do ícone (fonte em docs/marca/logo.svg): hambúrguer cortado por um traço de "proibido".
const TOP_BUN = "M118 238C118 166 180 118 256 118S394 166 394 238Q394 252 380 252H132Q118 252 118 238Z";
const BOTTOM_BUN = "M118 348H394V364C394 390 374 404 350 404H162C138 404 118 390 118 364Z";

function Burger({ maskId }: { maskId: string }) {
  return (
    <>
      <defs>
        <mask id={maskId}>
          <rect x="0" y="0" width="512" height="512" fill="#fff" />
          <line x1="140" y1="440" x2="384" y2="136" stroke="#000" strokeWidth="70" strokeLinecap="round" />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d={TOP_BUN} />
        <rect x="104" y="274" width="304" height="52" rx="26" />
        <path d={BOTTOM_BUN} />
      </g>
      <line x1="140" y1="440" x2="384" y2="136" stroke="currentColor" strokeWidth="28" strokeLinecap="round" />
    </>
  );
}

/** Ícone colorido do app (quadrado arredondado com degradê). */
export function LogoIcon({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="0 0 512 512" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-bg`} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#e02a19" />
          <stop offset="0.45" stopColor="#ee4a14" />
          <stop offset="1" stopColor="#f5a300" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="116" fill={`url(#${id}-bg)`} />
      <g fill="#fff7ee" color="#fff7ee">
        <Burger maskId={`${id}-cut`} />
      </g>
      <path d="M184 204Q198 172 232 160" fill="none" stroke="#f26a10" strokeWidth="16" strokeLinecap="round" />
    </svg>
  );
}

/** Só o hambúrguer cortado, na cor do texto atual: para marca d'água e ilustrações. */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");

  return (
    <svg viewBox="96 110 320 340" className={className} fill="currentColor" aria-hidden="true">
      <Burger maskId={`${id}-cut`} />
    </svg>
  );
}

/** Ícone + nome "DeNovoNao", com o "Nao" no degradê da marca. */
export function Wordmark({
  className,
  iconClassName,
  textClassName,
}: {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
}) {
  return (
    <span className={clsx("inline-flex items-center gap-2.5", className)}>
      <LogoIcon className={clsx("h-9 w-9 shrink-0 drop-shadow-[0_6px_14px_rgba(230,51,34,0.35)]", iconClassName)} />
      <span className={clsx("text-lg font-extrabold tracking-tight text-[var(--text)]", textClassName)}>
        DeNovo<span className="text-gradient">Nao</span>
      </span>
    </span>
  );
}
