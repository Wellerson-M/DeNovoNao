"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SESSION_EXPIRED_EVENT } from "@/lib/api/session";
import { decodeTokenToSession } from "@/lib/auth/decode-token";
import type { AuthSession } from "@/lib/types";

type AuthContextValue = {
  session: AuthSession | null;
  isReady: boolean;
  /** true quando a sessão salva venceu e o app saiu sozinho (para mostrar um aviso). */
  sessionExpired: boolean;
  dismissSessionExpired: () => void;
  loginWithToken: (token: string) => void;
  loginAsVisitor: () => void;
  logout: () => void;
};

const STORAGE_KEY = "denovonao-auth";

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);

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

  useEffect(() => {
    const handleExpired = () => {
      try {
        if (!window.localStorage.getItem(STORAGE_KEY)) {
          return;
        }
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        // sem storage: só limpa o estado
      }
      setSession(null);
      setSessionExpired(true);
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const dismissSessionExpired = useCallback(() => setSessionExpired(false), []);

  const loginWithToken = useCallback((token: string) => {
    const nextSession = decodeTokenToSession(token.trim());
    setSessionExpired(false);
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
      sessionExpired,
      dismissSessionExpired,
      loginWithToken,
      loginAsVisitor,
      logout,
    }),
    [dismissSessionExpired, isReady, loginAsVisitor, loginWithToken, logout, session, sessionExpired]
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
