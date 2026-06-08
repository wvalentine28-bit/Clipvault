"use client";

import { ReactNode, useEffect } from "react";
import { useJarvisStore } from "@/store";
import { apiClient } from "@/lib/api";

export function AuthProvider({ children }: { children: ReactNode }) {
  const { setUser, setToken, token } = useJarvisStore();

  useEffect(() => {
    if (!token) return;
    apiClient
      .get("/auth/me")
      .then((data) => setUser(data))
      .catch(() => {
        setToken(null);
        setUser(null);
      });
  }, [token]);

  return <>{children}</>;
}
