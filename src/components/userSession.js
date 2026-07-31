"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export function useUserSession() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingUser, setLoading] = useState(true);
  // La navbar vive en el layout raiz, asi que no se remonta al navegar: sin
  // esta dependencia el boton seguiria diciendo LOGIN despues de iniciar
  // sesion (y ADMIN despues del logoff). router.refresh() no alcanza, solo
  // revalida server components.
  const pathname = usePathname();

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
  }, [pathname]);

  return { user, isAdmin, loadingUser };
}
