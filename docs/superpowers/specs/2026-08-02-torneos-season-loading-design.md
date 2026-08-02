# Torneos year filter: loading parity with ranking's season selector

## Problem

`/ranking`'s season selector (`SeasonTabs`) gives instant feedback when you switch
seasons: the active tab and a scoped spinner update the moment you click, via a
client-side `useTransition`/`useOptimistic` provider (`SeasonTransitionProvider`),
before the buffered RSC navigation actually commits.

`/torneos`'s year filter (`Todos` + year pills in `page.js`) has no such mechanism —
it's a plain `<Link>`. Clicking a year gives no feedback until the full server
round-trip completes.

## Goal

Give torneos' year filter the same perceived-responsiveness behavior as ranking's
season selector: active pill updates immediately on click, and a scoped loading
state appears for the part of the page that's about to change, while unaffected
areas (hero, featured-tournament card) stay static.

## Design

### 1. Extract the generic transition logic (shared by ranking and torneos)

`SeasonTransitionProvider.js` (ranking-only today) is conceptually generic:
optimistic same-route searchParams navigation with a pending flag. Two features
now need it, so it moves to a shared location instead of being duplicated.

New file: `src/components/ui/SearchParamTransitionProvider.js` (client)

```js
export default function SearchParamTransitionProvider({ value, children }) { ... }
export function useSearchParamTransition() {
  // returns { isPending, navigate(href, nextValue), valorMostrado }
}
```

Internals are a direct move of the current `SeasonTransitionProvider` body
(`useTransition` + `useOptimistic` + `router.push(href, { scroll: false })`),
generalized from `temporada`/`temporadaMostrada` to `value`/`valorMostrado`.

Ranking changes to adopt it:
- Delete `src/app/ranking/SeasonTransitionProvider.js`.
- `page.js`, `SeasonTabs.js`, `SeasonRibbon.js`, `RankingTableBoundary.js` import
  `SearchParamTransitionProvider` / `useSearchParamTransition` from the shared path
  instead. Each consumer aliases `valorMostrado` back to `temporadaMostrada` at the
  destructuring site (`const { valorMostrado: temporadaMostrada } = ...`) so the
  rest of their code is untouched.

No behavior change on `/ranking` — this is a pure extraction.

### 2. Torneos: new interactive filter + scoped loading

New file: `src/app/torneos/TorneoYearTabs.js` (client)
- Same visual pills as today (`Todos` + one pill per year, same classes/active
  styling).
- Wrapped in `SearchParamTransitionProvider`'s context: clicking a pill calls
  `navigate(href, year)` (year is `"all"` for the Todos pill) instead of relying on
  a plain `<Link>` browser navigation, mirroring `SeasonTabs`' click interception
  (ignores modified clicks — ctrl/cmd/shift/middle-click — so new-tab etc. still
  work).
- Active-state check uses the optimistic `valorMostrado`, not the server-resolved
  `selectedYear` prop, so the highlighted pill moves on click, not on commit.

New file: `src/app/torneos/TorneoListBoundary.js` (client)
- `const { isPending, valorMostrado } = useSearchParamTransition();`
- `isPending ? <TorneoListLoading year={valorMostrado} /> : children`
- No `<Suspense>` wrapper (unlike `RankingTableBoundary`): torneos' list isn't
  independently async — `getTorneos`/`getFiltroAno` are fetched once at the top of
  `page.js` and filtered in memory, there's no separate per-year query to suspend
  on. The `isPending` phase alone covers the click-to-commit gap; a hard
  navigation/no-JS reload has no equivalent gap to plug (the whole page blocks and
  renders atomically either way, same as it does today).

New file: `src/app/torneos/TorneoListLoading.js`
- Same ring-spinner visual language as `RankingTableLoading` (`animate-ring-spin` /
  `animate-ring-spin-rev`, same container treatment), sized for the list area.
- Label: `CARGANDO TEMPORADA {year}…` for a specific year, `CARGANDO TODOS LOS
  TORNEOS…` when `year === "all"`.

`src/app/torneos/page.js` changes:
- Wrap the existing content `<section>` (featured card + filter + list) in
  `<SearchParamTransitionProvider value={selectedYear}>`.
- Replace the inline `<Link>` pill block with `<TorneoYearTabs anos={anos}
  selectedYear={selectedYear} />`.
- Wrap the `filtered.map(...)` + empty-state block in `<TorneoListBoundary>`.
- Hero (title, total count) and the featured-tournament card are left outside any
  loading treatment — neither depends on `selectedYear`.

## Out of scope

- No change to how torneos data is fetched (`getTorneos`/`getFiltroAno` stay a
  single combined fetch at the top of the page) — splitting the list into its own
  Suspense-streamed async component isn't needed for this behavior and isn't part
  of this task.
- No visual redesign of the torneos pills to match ranking's sliding-indicator
  tab style — only the loading *behavior* is being matched, not the visual design
  of the selector itself.

## Testing

- Manual: click each torneos year pill and confirm the active pill + loading
  placeholder appear immediately, list content updates once the navigation
  commits, hero/featured card stay static throughout.
- Manual: confirm modified clicks (ctrl/cmd/shift/middle-click, right-click "open
  in new tab") on a pill still work normally.
- Manual: confirm `/ranking` behavior is unchanged after the extraction.
- Existing e2e coverage for ranking's season switch (Playwright, per recent
  commit history) should keep passing unmodified — the extraction is not meant to
  change ranking's DOM/behavior.
