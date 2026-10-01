import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { auth, lookups } from "../api";
import type { Role, User } from "../types/models";

const KEY = "atc-session";
const TIMEOUT_MS = 30 * 60 * 1000; // system_settings.sessionTimeoutMinutes

type Ctx = {
  user: User | null;
  expired: boolean;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  setUser: (u: User) => void;
  refresh: () => void;
};
const AuthCtx = createContext<Ctx | null>(null);

function readSession(): User | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const { userId, at } = JSON.parse(raw) as { userId: number; at: number };
    if (Date.now() - at > TIMEOUT_MS) return null;
    return lookups.user(userId) ?? null;
  } catch {
    return null;
  }
}
function writeSession(u: User | null) {
  try {
    if (u) localStorage.setItem(KEY, JSON.stringify({ userId: u.id, at: Date.now() }));
    else localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(readSession);
  const [expired, setExpired] = useState(false);
  const lastActive = useRef(Date.now());
  const qc = useQueryClient();

  const setUser = useCallback((u: User) => {
    setUserState({ ...u });
    writeSession(u);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await auth.login(email, password);
    qc.clear();
    setExpired(false);
    setUser(u);
    return u;
  }, [qc, setUser]);

  const logout = useCallback(() => {
    writeSession(null);
    setUserState(null);
    setExpired(false);
    qc.clear();
  }, [qc]);

  const refresh = useCallback(() => {
    setUserState((u) => (u ? { ...(lookups.user(u.id) ?? u) } : u));
  }, []);

  useEffect(() => {
    if (!user) return;
    const touch = () => {
      lastActive.current = Date.now();
      writeSession(user);
    };
    const events = ["mousedown", "keydown", "touchstart"];
    events.forEach((e) => window.addEventListener(e, touch));
    const t = setInterval(() => {
      if (Date.now() - lastActive.current > TIMEOUT_MS) setExpired(true);
    }, 30_000);
    return () => {
      events.forEach((e) => window.removeEventListener(e, touch));
      clearInterval(t);
    };
  }, [user]);

  const value = useMemo(() => ({ user, expired, login, logout, setUser, refresh }), [user, expired, login, logout, setUser, refresh]);
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export function useAuth() {
  const c = useContext(AuthCtx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}

/** Signed-in user (pages under RequireRole can rely on it). */
export function useMe() {
  const { user } = useAuth();
  if (!user) throw new Error("Not signed in");
  return user;
}

export const HOME: Record<Role, string> = { ADMIN: "/admin", MANAGER: "/manager", STAFF: "/staff", FAMILY: "/family" };
export const ROLE_LABEL: Record<Role, string> = { ADMIN: "Administrator", MANAGER: "Center Manager", STAFF: "Caregiver / Staff", FAMILY: "Family Member" };
