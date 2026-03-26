"use client";

import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ConnectionProvider, useConnection } from "@/contexts/connection-context";
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

function ProvidersRuntime({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const { isOnline } = useConnection();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") {
      if ("serviceWorker" in navigator) {
        void navigator.serviceWorker.register("/sw.js");
      }
    } else {
      void clearLegacyOfflineCaches();
    }

    if (isOnline) {
      void syncPendingReviews(session?.token ?? null);
    }
  }, [isOnline, session?.token]);

  return <>{children}</>;
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider>
      <AuthProvider>
        <ProvidersRuntime>{children}</ProvidersRuntime>
      </AuthProvider>
    </ConnectionProvider>
  );
}
