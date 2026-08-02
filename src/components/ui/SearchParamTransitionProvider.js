"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

// Client-side navigations that only change a searchParam on the same route
// do NOT get progressive Suspense streaming from Next's router -- there's no
// loading.js for these segments, and the router buffers the full RSC
// response before committing anything, inline <Suspense> boundaries
// notwithstanding. This context bridges a trigger component (a tab/pill
// selector) and a scoped loading boundary elsewhere on the page:
//
//   - `isPending`: to show a scoped spinner the moment a click happens,
//     instead of waiting on the router's buffered navigation.
//   - `valorMostrado`: the optimistic value (e.g. the year just clicked).
//     The server takes ~50-100ms to return the new shell, and until then
//     every consumer that displays "what's currently selected" (an eyebrow,
//     a tab indicator, a loading label) would otherwise keep announcing the
//     OLD value -- which reads as "loading the wrong thing" for a beat.
//
// useOptimistic reverts only when the transition ends; by then the base
// value from the server is already the new one, so it never flickers back.
const SearchParamTransitionContext = createContext(null);

export default function SearchParamTransitionProvider({ value, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valorMostrado, setValorOptimista] = useOptimistic(value);

  function navigate(href, nextValue) {
    startTransition(() => {
      setValorOptimista(nextValue);
      // scroll: false -- these are same-page filter changes, not page
      // changes; the default would jump back to the top mid-read.
      router.push(href, { scroll: false });
    });
  }

  return (
    <SearchParamTransitionContext.Provider value={{ isPending, navigate, valorMostrado }}>
      {children}
    </SearchParamTransitionContext.Provider>
  );
}

export function useSearchParamTransition() {
  const ctx = useContext(SearchParamTransitionContext);
  if (!ctx) {
    throw new Error("useSearchParamTransition must be used within a SearchParamTransitionProvider");
  }
  return ctx;
}
