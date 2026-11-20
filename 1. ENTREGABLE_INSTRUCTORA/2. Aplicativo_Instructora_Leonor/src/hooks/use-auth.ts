"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@/lib/types";
import {
  getCurrentUser,
  getSession,
  login as authLogin,
  logout as authLogout,
  register as authRegister,
  type Session,
} from "@/lib/auth";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const s = getSession();
    setSession(s);
    setUser(getCurrentUser());
    setLoading(false);
  }, []);

  const login = useCallback(
    (username: string, password: string) => {
      const res = authLogin(username, password);
      if (res.ok) {
        setSession(getSession());
        setUser(res.user);
      }
      return res;
    },
    []
  );

  const register = useCallback(
    (params: {
      nombre: string;
      username: string;
      password: string;
      role?: User["role"];
    }) => {
      const res = authRegister(params);
      return res;
    },
    []
  );

  const logout = useCallback(() => {
    authLogout();
    setSession(null);
    setUser(null);
  }, []);

  const refresh = useCallback(() => {
    setSession(getSession());
    setUser(getCurrentUser());
  }, []);

  return {
    session,
    user,
    loading,
    isAdmin: user?.role === "admin",
    login,
    register,
    logout,
    refresh,
  };
}
