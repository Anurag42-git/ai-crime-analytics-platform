"use client";
import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from "react";

export type Role = "OFFICER" | "CITIZEN";
export type SessionUser = { id: string; name: string; email: string; role: string } | null;

const Ctx = createContext<{
  session: SessionUser;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  register: (email: string, password: string, name: string, role: Role) => Promise<{ ok: boolean; error?: string }>;
  logout: () => Promise<void>;
}>({
  session: null,
  loading: true,
  login: async () => ({ ok: false }),
  register: async () => ({ ok: false }),
  logout: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => setSession(d.user ?? null))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const d = await r.json();
    if (d.ok) {
      setSession(d.user);
      return { ok: true };
    }
    return { ok: false, error: d.error ?? "Login failed" };
  }, []);

  const register = useCallback(async (email: string, password: string, name: string, role: Role) => {
    const r = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name, role }),
    });
    const d = await r.json();
    if (d.ok) {
      setSession(d.user);
      return { ok: true };
    }
    return { ok: false, error: d.error ?? "Registration failed" };
  }, []);

  const logout = useCallback(async () => {
    await fetch("/api/auth/session", { method: "POST" });
    setSession(null);
    window.location.href = "/";
  }, []);

  return <Ctx.Provider value={{ session, loading, login, register, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
