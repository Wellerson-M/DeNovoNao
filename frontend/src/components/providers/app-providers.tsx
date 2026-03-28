"use client";

import { useEffect } from "react";
import { AuthProvider, useAuth } from "@/contexts/auth-context";
import { ConnectionProvider, useConnection } from "@/contexts/connection-context";
import { PwaProvider, usePwa } from "@/contexts/pwa-context";
import { UiProvider, useUi } from "@/contexts/ui-context";
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
  const { isBusy } = useUi();
  const { isCheckingUpdate } = usePwa();

  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      void clearLegacyOfflineCaches();
      return;
    }
  }, []);

  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let hasRefreshed = false;

    void navigator.serviceWorker.register("/sw.js").then((registration) => {
      const monitorWorker = (worker: ServiceWorker | null) => {
        if (!worker) {
          return;
        }

        worker.addEventListener("statechange", () => {
          if (worker.state === "installed" && navigator.serviceWorker.controller) {
            worker.postMessage({ type: "SKIP_WAITING" });
          }
        });
      };

      monitorWorker(registration.installing);
      registration.addEventListener("updatefound", () => {
        monitorWorker(registration.installing);
      });
    });

    const handleControllerChange = () => {
      if (hasRefreshed) {
        return;
      }

      hasRefreshed = true;
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener("controllerchange", handleControllerChange);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", handleControllerChange);
    };
  }, []);

  useEffect(() => {
    if (isOnline) {
      void syncPendingReviews(session?.token ?? null);
    }
  }, [isOnline, session?.token]);

  return (
    <>
      {children}
      {isBusy || isCheckingUpdate ? (
        <div className="pointer-events-none fixed inset-0 z-[90] flex items-center justify-center bg-[rgba(10,5,7,0.08)] backdrop-blur-[2px]">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[var(--field-border)] bg-[var(--panel)] shadow-[var(--panel-shadow)]">
            <span className="h-7 w-7 animate-spin rounded-full border-2 border-[var(--accent-soft)]/30 border-t-[var(--accent)]" />
          </div>
        </div>
      ) : null}
    </>
  );
}

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <ConnectionProvider>
      <PwaProvider>
        <UiProvider>
          <AuthProvider>
            <ProvidersRuntime>{children}</ProvidersRuntime>
          </AuthProvider>
        </UiProvider>
      </PwaProvider>
    </ConnectionProvider>
  );
}
