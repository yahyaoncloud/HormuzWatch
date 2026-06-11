import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

// ── Session Storage Token (Survives Refresh, Not in LocalStorage) ─────────────
// The user requested not to use localStorage. We use sessionStorage instead so
// that the token survives a tab refresh but is cleared when the tab is closed.

export function getInMemoryToken(): string | null {
  return sessionStorage.getItem("auth_token");
}

function setInMemoryToken(token: string | null) {
  if (token) {
    sessionStorage.setItem("auth_token", token);
  } else {
    sessionStorage.removeItem("auth_token");
  }
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface User {
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  user: User | null;
  sessionId: string | null;
  expiresAt: string | null;
  login: (token: string, user: User, session?: { sessionId?: string; expiresAt?: string }) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ── AuthProvider ───────────────────────────────────────────────────────────────
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  // Start in loading state; we validate via server on mount
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const navigate = useNavigate();
  const logoutTimerRef = useRef<number | null>(null);

  const clearSession = useCallback(() => {
    setInMemoryToken(null);
    setUser(null);
    setSessionId(null);
    setExpiresAt(null);
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
  }, []);

  const scheduleAutoLogout = useCallback((expiry: string) => {
    const delay = new Date(expiry).getTime() - Date.now();
    if (delay <= 0) { clearSession(); return; }
    if (logoutTimerRef.current) window.clearTimeout(logoutTimerRef.current);
    logoutTimerRef.current = window.setTimeout(() => {
      clearSession();
      navigate("/login");
    }, delay);
  }, [clearSession, navigate]);

  const login = useCallback((newToken: string, newUser: User, session?: { sessionId?: string; expiresAt?: string }) => {
    setInMemoryToken(newToken);
    setUser(newUser);
    setSessionId(session?.sessionId ?? null);
    setExpiresAt(session?.expiresAt ?? null);
    setIsSessionLoading(false);
    if (session?.expiresAt) scheduleAutoLogout(session.expiresAt);
    navigate("/dashboard");
  }, [navigate, scheduleAutoLogout]);

  const logout = useCallback(async () => {
    // Best-effort server logout
    const token = getInMemoryToken();
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch { /* ignore */ }
    }
    clearSession();
    setIsSessionLoading(false);
    navigate("/login");
  }, [clearSession, navigate]);

  // ── On mount: validate session via server ─────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function validateSession() {
      const tokenToSend = getInMemoryToken();
      if (!tokenToSend) {
        setIsSessionLoading(false);
        return;
      }

      try {
        const res = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${tokenToSend}` },
        });

        if (!res.ok) throw new Error("Session invalid");

        const data = await res.json();
        if (cancelled) return;

        setUser(data.user);
        setSessionId(data.sessionId);
        setExpiresAt(data.expiresAt);
        if (data.expiresAt) scheduleAutoLogout(data.expiresAt);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsSessionLoading(false);
      }
    }

    validateSession();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Listen for 401s from any fetch call ───────────────────────────────────
  useEffect(() => {
    const handler = () => {
      clearSession();
      setIsSessionLoading(false);
      navigate("/login");
    };
    window.addEventListener("auth:unauthorized", handler);
    return () => window.removeEventListener("auth:unauthorized", handler);
  }, [clearSession, navigate]);

  const isAuthenticated = !!user && !!getInMemoryToken();

  return (
    <AuthContext.Provider value={{ user, sessionId, expiresAt, login, logout, isAuthenticated, isSessionLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
