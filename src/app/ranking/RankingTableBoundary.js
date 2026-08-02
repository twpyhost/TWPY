"use client";

import { Suspense } from "react";

import RankingTableLoading from "./RankingTableLoading";
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

// Dueno de los DOS estados de carga de la tabla, para que ambos anuncien la
// misma temporada:
//
//   - `isPending`: entre el click en un tab y el commit del shell RSC
//     (~50-100ms). Cubre la navegacion cliente que el <Suspense> inline no
//     streamea progresivamente (navegacion solo-searchParams en la misma
//     ruta, sin loading.js para este segmento).
//   - el fallback del <Suspense>: desde ese commit hasta que RankingTable
//     termina de resolver getRankings. Tambien es el unico que actua en el
//     SSR / hard reload, donde `isPending` arranca en false.
//
// Antes cada uno se construia por separado en page.js, cerrado sobre la
// `temporada` de su propio render, y el primero mostraba la temporada VIEJA:
// el label saltaba de una a la otra a mitad del loading. Ahora los dos leen
// `temporadaMostrada` (optimista) del contexto.
export default function RankingTableBoundary({ children }) {
  const { isPending, valorMostrado: temporadaMostrada } = useSearchParamTransition();

  const cargando = <RankingTableLoading temporada={temporadaMostrada} />;

  return isPending ? cargando : <Suspense fallback={cargando}>{children}</Suspense>;
}
