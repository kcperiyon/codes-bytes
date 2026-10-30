import { createContext, useContext, useState, ReactNode } from "react";
import { Navigate } from "react-router-dom";

export type Role = "ADMIN" | "PARTNER" | "ASSOCIATE";

export interface Session {
  token: string;
  role: Role;
  name: string;
  code?: string;
}

const STORAGE_KEY = "cnb_auth";

function load(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

interface AuthContextShape {
  session: Session | null;
  login: (session: Session) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextShape | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(load());

  function login(s: Session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSession(s);
  }
  function logout() {
    localStorage.removeItem(STORAGE_KEY);
    setSession(null);
  }

  return <AuthContext.Provider value={{ session, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { session } = useAuth();
  if (!session || session.role !== role) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}
