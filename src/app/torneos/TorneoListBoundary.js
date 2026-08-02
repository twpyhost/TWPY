"use client";

import TorneoListLoading from "./TorneoListLoading";
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

// A diferencia de RankingTableBoundary, no envuelve en <Suspense>: la lista
// de torneos no hace su propio fetch por temporada (page.js ya trae todos
// los torneos y filtra en memoria), asi que no hay nada que suspender -- el
// unico hueco de carga a cubrir es el de la transicion cliente (isPending).
export default function TorneoListBoundary({ children }) {
  const { isPending, valorMostrado } = useSearchParamTransition();

  return isPending ? <TorneoListLoading year={valorMostrado} /> : children;
}
