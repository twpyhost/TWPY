"use client";

import { useSeasonTransition } from "./SeasonTransitionProvider";

// While a season-switch transition (from SeasonTabs) is pending, show the
// scoped loading fallback instead of the server-rendered table below --
// this covers the client-navigation case that inline <Suspense> doesn't
// stream progressively for (searchParams-only navigation on the same
// route, no loading.js for this segment). The true SSR/initial-load case
// keeps streaming via the <Suspense> boundary in page.js, unaffected by
// this wrapper: `isPending` is false on first render/hard reload.
export default function RankingTableBoundary({ loading, children }) {
  const { isPending } = useSeasonTransition();

  return isPending ? loading : children;
}
