"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

// Client-side navigations that only change `?year=` on the same /ranking
// route do NOT get progressive Suspense streaming from Next's router --
// there's no loading.js for this segment, and the router buffers the full
// RSC response before committing anything, inline <Suspense> boundaries
// notwithstanding. This context bridges dos cosas entre SeasonTabs (dentro
// del hero, arriba) y RankingTableBoundary (una seccion hermana, abajo):
//
//   - `isPending`: para mostrar el spinner scopeado a la tabla apenas se
//     hace click, sin esperar la navegacion bufereada.
//   - `temporadaMostrada`: la temporada optimista. El servidor tarda ~50-100ms
//     en devolver el shell nuevo, y hasta entonces TODO lo que muestre la
//     temporada (el eyebrow, el indicador de los tabs, el label del spinner)
//     seguiria anunciando la temporada vieja -- que es justo lo que se veia
//     como "cargando temporada <vieja>" antes de saltar a la nueva.
//
// useOptimistic revierte solo al terminar la transicion; para entonces el
// valor base que llega del servidor ya es el nuevo, asi que no parpadea.
const SeasonTransitionContext = createContext(null);

export default function SeasonTransitionProvider({ temporada, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [temporadaMostrada, setTemporadaOptimista] = useOptimistic(temporada);

  function navigate(href, year) {
    startTransition(() => {
      setTemporadaOptimista(year);
      // scroll: false -- cambiar de temporada no es cambiar de pagina; el
      // default de Next saltaria al tope y perderias donde estabas leyendo.
      router.push(href, { scroll: false });
    });
  }

  return (
    <SeasonTransitionContext.Provider value={{ isPending, navigate, temporadaMostrada }}>
      {children}
    </SeasonTransitionContext.Provider>
  );
}

export function useSeasonTransition() {
  const ctx = useContext(SeasonTransitionContext);
  if (!ctx) {
    throw new Error("useSeasonTransition must be used within a SeasonTransitionProvider");
  }
  return ctx;
}
