"use client";

import { createContext, useContext, useMemo, useState } from "react";

type PwaContextValue = {
  isCheckingUpdate: boolean;
};

const PwaContext = createContext<PwaContextValue | null>(null);

export function PwaProvider({ children }: { children: React.ReactNode }) {
  const [isCheckingUpdate] = useState(false);

  const value = useMemo(
    () => ({
      isCheckingUpdate,
    }),
    [isCheckingUpdate]
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
