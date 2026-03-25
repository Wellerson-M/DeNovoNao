import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "Avalieitor",
  description: "PWA offline-first para avaliar lanchonetes em casal.",
  ...(process.env.NODE_ENV === "production"
    ? {
        manifest: "/manifest.json",
        appleWebApp: {
          capable: true,
          title: "Avalieitor",
          statusBarStyle: "black-translucent" as const,
        },
      }
    : {}),
};

export const viewport: Viewport = {
  themeColor: "#ff7a18",
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
