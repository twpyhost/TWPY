"use client";

import { createContext, useContext, useTransition } from "react";
import { useRouter } from "next/navigation";

// Client-side navigations that only change `?year=` on the same /ranking
// route do NOT get progressive Suspense streaming from Next's router (see
// task-2-report.md) -- there's no loading.js for this segment, and the
// router buffers the full RSC response before committing anything, inline
// <Suspense> boundaries notwithstanding. This context bridges a single
// `isPending` boolean (from useTransition) between SeasonTabs (inside the
// hero, top of the page) and RankingTableBoundary (a sibling section below
// the hero) so the table region can show a scoped spinner immediately on
// click, without waiting on the buffered navigation.
const SeasonTransitionContext = createContext(null);

export default function SeasonTransitionProvider({ children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function navigate(href) {
    startTransition(() => {
      router.push(href);
    });
  }

  return (
    <SeasonTransitionContext.Provider value={{ isPending, navigate }}>
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
