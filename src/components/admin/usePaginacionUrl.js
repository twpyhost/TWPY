"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

// Estado de paginacion/filtros en la URL de las listas del admin. Vive en
// ?page=/?q=/etc en vez de useState para que un F5 (o compartir el link) caiga
// en la misma pagina, y para que el fetch pueda pedirle al servidor
// exactamente esa pagina.
//
// `replace` + scroll:false: cambiar de pagina no es navegar, no tiene que
// ensuciar el historial ni saltar al tope de la lista.
export function usePaginacionUrl({ extras = [] } = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const paginaCruda = Number.parseInt(searchParams.get("page"), 10);
  const pagina = Number.isFinite(paginaCruda) && paginaCruda > 0 ? paginaCruda : 1;
  const q = searchParams.get("q") ?? "";

  const escribir = useCallback(
    (cambios) => {
      const params = new URLSearchParams(searchParams);
      for (const [clave, valor] of Object.entries(cambios)) {
        if (valor === null || valor === undefined || valor === "" || valor === 1) {
          params.delete(clave);
        } else {
          params.set(clave, String(valor));
        }
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const irAPagina = useCallback((destino) => escribir({ page: destino }), [escribir]);

  // Cualquier cambio de filtro vuelve a la pagina 1: quedarse en la 7 de un
  // resultado que ahora tiene 2 paginas mostraria una lista vacia.
  const cambiarFiltro = useCallback(
    (cambios) => escribir({ ...cambios, page: null }),
    [escribir],
  );

  // Se memoiza contra primitivos (la URL serializada y los nombres de los
  // params extra) para que `query` sea estable entre renders y no dispare el
  // useEffect que hace el fetch en cada uno.
  const claveUrl = searchParams.toString();
  const nombresExtra = extras.join(",");

  const { query, extrasResueltos } = useMemo(() => {
    const actuales = new URLSearchParams(claveUrl);
    const params = new URLSearchParams();
    if (pagina > 1) params.set("page", String(pagina));
    if (q) params.set("q", q);

    const resueltos = {};
    for (const nombre of nombresExtra ? nombresExtra.split(",") : []) {
      const valor = actuales.get(nombre);
      resueltos[nombre] = valor;
      if (valor) params.set(nombre, valor);
    }

    return { query: params.toString(), extrasResueltos: resueltos };
  }, [claveUrl, nombresExtra, pagina, q]);

  return { pagina, q, extras: extrasResueltos, query, irAPagina, cambiarFiltro };
}

// El buscador ahora pega al servidor, asi que no puede dispararse en cada
// tecla: se escribe en local y recien se sincroniza a la URL al frenar.
export function useBusquedaDebounced(qUrl, onCambio, ms = 300) {
  const [texto, setTexto] = useState(qUrl);

  // La URL manda si cambia por fuera (back/forward, link pegado).
  useEffect(() => {
    setTexto(qUrl);
  }, [qUrl]);

  useEffect(() => {
    if (texto === qUrl) return undefined;
    const id = setTimeout(() => onCambio(texto), ms);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [texto, qUrl, ms]);

  return [texto, setTexto];
}
