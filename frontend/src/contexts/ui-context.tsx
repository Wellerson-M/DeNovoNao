"use client";

import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

type UiContextValue = {
  isBusy: boolean;
  showLoaderFor: (durationMs?: number) => void;
  withLoader: <T>(task: Promise<T>, minimumMs?: number) => Promise<T>;
};

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: React.ReactNode }) {
  const [isBusy, setIsBusy] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearBusyTimer = useCallback(() => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const showLoaderFor = useCallback(
    (durationMs = 450) => {
      setIsBusy(true);
      clearBusyTimer();
      timerRef.current = window.setTimeout(() => {
        setIsBusy(false);
        timerRef.current = null;
      }, durationMs);
    },
    [clearBusyTimer]
  );

  const withLoader = useCallback(
    async <T,>(task: Promise<T>, minimumMs = 450) => {
      const startedAt = Date.now();
      setIsBusy(true);
      clearBusyTimer();

      try {
        const result = await task;
        const elapsed = Date.now() - startedAt;
        const remaining = Math.max(minimumMs - elapsed, 0);

        await new Promise((resolve) => {
          timerRef.current = window.setTimeout(resolve, remaining);
        });

        return result;
      } finally {
        setIsBusy(false);
        clearBusyTimer();
      }
    },
    [clearBusyTimer]
  );

  const value = useMemo(
    () => ({
      isBusy,
      showLoaderFor,
      withLoader,
    }),
    [isBusy, showLoaderFor, withLoader]
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const context = useContext(UiContext);

  if (!context) {
    throw new Error("useUi must be used within UiProvider");
  }

  return context;
}
