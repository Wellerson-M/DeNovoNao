"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ConnectionContextValue = {
  isOnline: boolean;
};

const ConnectionContext = createContext<ConnectionContextValue | null>(null);

export function ConnectionProvider({ children }: { children: React.ReactNode }) {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    setIsOnline(navigator.onLine);

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const value = useMemo(() => ({ isOnline }), [isOnline]);
  return <ConnectionContext.Provider value={value}>{children}</ConnectionContext.Provider>;
}

export function useConnection() {
  const context = useContext(ConnectionContext);

  if (!context) {
    throw new Error("useConnection must be used within ConnectionProvider");
  }

  return context;
}
