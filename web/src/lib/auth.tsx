import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, getToken, setToken } from "./api";
import type { User } from "./types";

type AuthCtx = {
  user: User | null;
  loading: boolean;
  isPremium: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (data: { name: string; email: string; password: string; levelId?: string }) => Promise<User>;
  /** Signs in with the ID token handed back by Google (see components/GoogleButton). */
  loginWithGoogle: (credential: string, levelId?: string) => Promise<User>;
  logout: () => void;
  refresh: () => Promise<void>;
  setUser: (u: User) => void;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!getToken());

  const refresh = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      setUser(await api.get<User>("/auth/me"));
    } catch {
      setToken(null);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const r = await api.post<{ token: string; user: User }>("/auth/login", { email, password });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const register = useCallback(async (data: { name: string; email: string; password: string; levelId?: string }) => {
    const r = await api.post<{ token: string; user: User }>("/auth/register", data);
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const loginWithGoogle = useCallback(async (credential: string, levelId?: string) => {
    const r = await api.post<{ token: string; user: User }>("/auth/google", { credential, levelId });
    setToken(r.token);
    setUser(r.user);
    return r.user;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthCtx>(() => {
    const isAdmin = user?.role === "ADMIN";
    const isPremium = isAdmin || (user?.plan === "PREMIUM" && (!user.premiumUntil || new Date(user.premiumUntil) > new Date()));
    return { user, loading, isPremium, isAdmin, login, register, loginWithGoogle, logout, refresh, setUser };
  }, [user, loading, login, register, loginWithGoogle, logout, refresh]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
