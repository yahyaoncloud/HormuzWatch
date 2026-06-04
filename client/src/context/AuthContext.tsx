import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";

interface User {
  username: string;
  email: string;
  role: string;
}

interface AuthContextType {
  token: string | null;
  user: User | null;
  sessionId: string | null;
  expiresAt: string | null;
  login: (token: string, user: User, session?: { sessionId?: string; expiresAt?: string }) => void;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
  isSessionLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));
  const [sessionId, setSessionId] = useState<string | null>(localStorage.getItem("sessionId"));
  const [expiresAt, setExpiresAt] = useState<string | null>(localStorage.getItem("expiresAt"));
  const [isSessionLoading, setIsSessionLoading] = useState(() => !!localStorage.getItem("token"));
  const [user, setUser] = useState<User | null>(() => {
    const savedUser = localStorage.getItem("user");
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("sessionId");
    localStorage.removeItem("expiresAt");
    setToken(null);
    setUser(null);
    setSessionId(null);
    setExpiresAt(null);
    window.dispatchEvent(new Event("auth:session-cleared"));
  }, []);

  const login = (newToken: string, newUser: User, session?: { sessionId?: string; expiresAt?: string }) => {
    localStorage.setItem("token", newToken);
    localStorage.setItem("user", JSON.stringify(newUser));
    if (session?.sessionId) {
      localStorage.setItem("sessionId", session.sessionId);
    }
    if (session?.expiresAt) {
      localStorage.setItem("expiresAt", session.expiresAt);
    }
    setToken(newToken);
    setUser(newUser);
    setSessionId(session?.sessionId || null);
    setExpiresAt(session?.expiresAt || null);
    setIsSessionLoading(false);
    window.dispatchEvent(new Event("auth:session-started"));
    navigate("/dashboard");
  };

  const logout = useCallback(async () => {
    const activeToken = localStorage.getItem("token");
    if (activeToken) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${activeToken}` },
        });
      } catch (err) {
        console.warn("[Auth] Logout request failed; clearing local session.", err);
      }
    }

    clearSession();
    setIsSessionLoading(false);
    navigate("/login");
  }, [clearSession, navigate]);

  useEffect(() => {
    if (!token) {
      setIsSessionLoading(false);
      return;
    }

    let cancelled = false;

    async function validateSession() {
      setIsSessionLoading(true);
      try {
        const res = await fetch("/api/auth/session", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) {
          throw new Error("Session is no longer valid");
        }

        const data = await res.json();
        if (cancelled) return;

        localStorage.setItem("user", JSON.stringify(data.user));
        localStorage.setItem("sessionId", data.sessionId);
        localStorage.setItem("expiresAt", data.expiresAt);
        setUser(data.user);
        setSessionId(data.sessionId);
        setExpiresAt(data.expiresAt);
      } catch (err) {
        if (!cancelled) {
          clearSession();
        }
      } finally {
        if (!cancelled) {
          setIsSessionLoading(false);
        }
      }
    }

    validateSession();

    return () => {
      cancelled = true;
    };
  }, [clearSession, token]);

  useEffect(() => {
    if (!expiresAt) return;

    const delay = new Date(expiresAt).getTime() - Date.now();
    if (delay <= 0) {
      void logout();
      return;
    }

    const timer = window.setTimeout(() => {
      void logout();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [expiresAt, logout]);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === "token" && !event.newValue) {
        clearSession();
      }
    };

    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [clearSession]);

  return (
    <AuthContext.Provider value={{ token, user, sessionId, expiresAt, login, logout, isAuthenticated: !!token && !!user, isSessionLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  };
  return context;
}
