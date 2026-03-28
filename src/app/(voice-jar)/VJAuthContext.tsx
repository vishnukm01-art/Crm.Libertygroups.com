"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";

interface VJUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface VJAuthContextType {
  user: VJUser | null;
  isAdmin: boolean;
  isReviewer: boolean;
  loading: boolean;
}

const VJAuthContext = createContext<VJAuthContextType>({
  user: null,
  isAdmin: false,
  isReviewer: false,
  loading: true,
});

export function VJAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<VJUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) setUser(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "sub_admin";
  const isReviewer = user?.role === "vj_reviewer";

  return (
    <VJAuthContext.Provider value={{ user, isAdmin, isReviewer, loading }}>
      {children}
    </VJAuthContext.Provider>
  );
}

export function useVJAuth() {
  return useContext(VJAuthContext);
}
