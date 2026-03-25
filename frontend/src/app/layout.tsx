import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

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
  themeColor: "#7c0116",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
