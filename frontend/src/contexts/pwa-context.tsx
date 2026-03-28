"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

type PwaContextValue = {
  isCheckingUpdate: boolean;
  refreshApp: () => Promise<void>;
};

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  const refreshApp = useCallback(async () => {
    if (typeof window === "undefined") {
      return;
    }

    if (!("serviceWorker" in navigator)) {
      window.location.reload();
      return;
    }

    setIsCheckingUpdate(true);

    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      if (registrations.length === 0) {
        window.location.reload();
        return;
      }

      await Promise.all(registrations.map((registration) => registration.update()));

      const waitingRegistration = registrations.find((registration) => registration.waiting);

      if (waitingRegistration?.waiting) {
        waitingRegistration.waiting.postMessage({ type: "SKIP_WAITING" });
        return;
      }

      const url = new URL(window.location.href);
      url.searchParams.set("refresh", Date.now().toString());
      window.location.replace(url.toString());
    } finally {
      window.setTimeout(() => setIsCheckingUpdate(false), 700);
    }
  }, []);

  const value = useMemo(
    () => ({
      isCheckingUpdate,
      refreshApp,
    }),
    [isCheckingUpdate, refreshApp]
  );

  return <PwaContext.Provider value={value}>{children}</PwaContext.Provider>;
}

export function usePwa() {
  const context = useContext(PwaContext);

  if (!context) {
    throw new Error("usePwa must be used within PwaProvider");
  }

  return context;
}
