import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

// Aplica o tema salvo antes da primeira pintura para não piscar escuro -> claro.
const themeScript = `try{var t=localStorage.getItem("denovonao-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`;

export const metadata: Metadata = {
  title: "DeNovoNao",
  description: "Aplicativo para registrar avaliações e não repetir erros gastronômicos.",
  ...(process.env.NODE_ENV === "production"
    ? {
        manifest: "/manifest.json",
        appleWebApp: {
          capable: true,
          title: "DeNovoNao",
          statusBarStyle: "black-translucent" as const,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#140b07",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={sans.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        {/* Aparece enquanto o app carrega (principalmente ao recarregar no celular).
            Some sozinho quando o React monta e marca o html como pronto. */}
        <div id="boot-splash" aria-hidden="true">
          <svg viewBox="0 0 512 512" width="72" height="72">
            <defs>
              <linearGradient id="boot-g" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0" stopColor="#e02a19" />
                <stop offset="0.45" stopColor="#ee4a14" />
                <stop offset="1" stopColor="#f5a300" />
              </linearGradient>
              <mask id="boot-cut">
                <rect x="0" y="0" width="512" height="512" fill="#fff" />
                <line x1="140" y1="440" x2="384" y2="136" stroke="#000" strokeWidth="70" strokeLinecap="round" />
              </mask>
            </defs>
            <rect width="512" height="512" rx="116" fill="url(#boot-g)" />
            <g mask="url(#boot-cut)" fill="#fff7ee">
              <path d="M118 238C118 166 180 118 256 118S394 166 394 238Q394 252 380 252H132Q118 252 118 238Z" />
              <rect x="104" y="274" width="304" height="52" rx="26" />
              <path d="M118 348H394V364C394 390 374 404 350 404H162C138 404 118 390 118 364Z" />
            </g>
            <line x1="140" y1="440" x2="384" y2="136" stroke="#fff7ee" strokeWidth="28" strokeLinecap="round" />
          </svg>
          <span id="boot-spinner" />
        </div>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
