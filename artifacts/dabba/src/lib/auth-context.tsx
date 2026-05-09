import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AuthUser } from "@workspace/api-client-react";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: () => void;
  logout: () => void;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = useCallback(async () => {
    // Check if there's a sid in the URL (Google OAuth landing)
    const urlParams = new URLSearchParams(window.location.search);
    const urlSid = urlParams.get("sid");
    if (urlSid) {
      localStorage.setItem("dabba_sid", urlSid);
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const sid = localStorage.getItem("dabba_sid");
    if (!sid) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/user");
      if (!res.ok) {
        if (res.status === 401) {
          localStorage.removeItem("dabba_sid");
        }
        throw new Error(`HTTP ${res.status}`);
      }
      const data = (await res.json()) as { user?: AuthUser | null } | null;
      setUser(data?.user ?? null);
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const login = useCallback(() => {
    window.location.assign("/login");
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // ignore network errors on logout
    }
    localStorage.removeItem("dabba_sid");
    setUser(null);
    window.location.assign("/");
  }, []);

  const refetch = useCallback(async () => {
    setIsLoading(true);
    await fetchUser();
  }, [fetchUser]);

  return (
    <AuthContext.Provider value={{ user, isLoading, isAuthenticated: !!user, login, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
