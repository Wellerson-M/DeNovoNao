"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { decodeTokenToSession } from "@/lib/auth/decode-token";
import type { AuthSession } from "@/lib/types";

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  loginWithToken: (token: string) => void;
  loginAsVisitor: () => void;
  logout: () => void;
};

const STORAGE_KEY = "denovonao-auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSession(JSON.parse(stored) as AuthSession);
      }
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    } finally {
      setIsReady(true);
    }
  }, []);

  const loginWithToken = useCallback((token: string) => {
    const nextSession = decodeTokenToSession(token.trim());
    setSession(nextSession);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextSession));
  }, []);

  const loginAsVisitor = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const logout = useCallback(() => {
    setSession(null);
    window.localStorage.removeItem(STORAGE_KEY);
  }, []);

  const value = useMemo(
    () => ({
      session,
      isReady,
      loginWithToken,
      loginAsVisitor,
      logout,
    }),
    [isReady, loginAsVisitor, loginWithToken, logout, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
