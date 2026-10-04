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
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
