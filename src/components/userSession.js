"use client";

import { useEffect, useState } from "react";

export function useUserSession() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUser, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const response = await fetch("/api/auth/session");
        const data = await response.json();

        if (mounted) {
          setUser(data.user || null);
          setIsAdmin(Boolean(data.isAdmin));
        }
      } catch {
        if (mounted) {
          setUser(null);
          setIsAdmin(false);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchUser();

    return () => {
      mounted = false;
    };
  }, []);

  return { user, isAdmin, loadingUser };
}
