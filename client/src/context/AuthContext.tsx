import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabase";

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

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const navigate = useNavigate();

  const clearSession = useCallback(() => {
    setInMemoryToken(null);
    setUser(null);
    setSessionId(null);
    setExpiresAt(null);
  }, []);

  const login = useCallback((newToken: string, newUser: User, session?: { sessionId?: string; expiresAt?: string }) => {
    setInMemoryToken(newToken);
    setUser(newUser);
    setSessionId(session?.sessionId ?? null);
    setExpiresAt(session?.expiresAt ?? null);
    setIsSessionLoading(false);
    navigate("/dashboard");
  }, [navigate]);

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearSession();
    setIsSessionLoading(false);
    navigate("/login");
  }, [clearSession, navigate]);

  useEffect(() => {
    let cancelled = false;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (session) {
        setInMemoryToken(session.access_token);
        setUser({
          username: session.user.email?.split("@")[0] || "SupabaseUser",
          email: session.user.email || "",
          role: "admin", // Defaulting to admin for MVP
        });
        setSessionId(session.user.id);
        setExpiresAt(new Date((session.expires_at || 0) * 1000).toISOString());
      } else {
        clearSession();
      }
      setIsSessionLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (session) {
        setInMemoryToken(session.access_token);
        setUser({
          username: session.user.email?.split("@")[0] || "SupabaseUser",
          email: session.user.email || "",
          role: "admin",
        });
        setSessionId(session.user.id);
        setExpiresAt(new Date((session.expires_at || 0) * 1000).toISOString());
      } else {
        clearSession();
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [clearSession]);

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
