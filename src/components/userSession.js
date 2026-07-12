"use client";

import { useEffect, useState } from "react";

export function useUserSession() {
  const [user, setUser] = useState(null);
  const [loadingUser, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function fetchUser() {
      try {
        const response = await fetch("/api/admin/session");
        const data = await response.json();

        if (mounted) {
          setUser(data.user || null);
        }
      } catch {
        if (mounted) {
          setUser(null);
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

  return { user, loadingUser };
}
