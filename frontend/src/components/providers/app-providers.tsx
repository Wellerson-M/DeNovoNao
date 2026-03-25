"use client";

import { useEffect } from "react";
import { syncPendingReviews } from "@/lib/offline/sync";

async function clearLegacyOfflineCaches() {
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));
    } catch {
      // ignore legacy cleanup failures
    }
  }

  if ("caches" in window) {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
    } catch {
      // ignore cache cleanup failures
    }
  }
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/sw.js");
      }
    } else {
      void clearLegacyOfflineCaches();
    }

    const handleOnline = () => {
      void syncPendingReviews();
    };

    window.addEventListener("online", handleOnline);

    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return <>{children}</>;
}
