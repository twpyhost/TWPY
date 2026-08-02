# Ranking — Top-3 Highlight & Scoped Season-Switch Loading — Design Spec

Date: 2026-08-01

## Overview

Two changes to `src/app/ranking/page.js`, both sourced from the Claude
Design prototype `Ranking Liga Tekken Paraguay - Landscape.dc.html`
(project `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`):

1. **Top-3 row background.** Positions 1–3 get a magenta-tinted background
   instead of the generic zebra-stripe, matching the prototype's `row()`
   helper (`bg: top ? 'rgba(245,10,100,.16)' : 'rgba(255,255,255,.05)'`).
2. **Scoped loading state when switching seasons.** Today, clicking a
   season tab (`SeasonTabs`, `?year=` + `next/link`) triggers the
   root `src/app/loading.js` (`PageLoadingRing`, full-page ring overlay)
   because `RankingPage` is one monolithic async Server Component. The
   prototype's own intent (confirmed by its `isLoading`/`tableAreaStyle`
   state) is a **loading state scoped to the results table only** — hero,
   season tabs, and the "COMPETIDORES RANKEADOS" stat stay in place.

Both are UI-only changes to the public `/ranking` page. No schema changes.

## Context: why the prototype isn't a literal port here

The prototype (`Ranking Liga Tekken Paraguay - Landscape.dc.html`) is a
**client-state single-file demo**: `selectSeason()` sets `loading: true`,
waits a fixed 620ms, then swaps `season` state and re-renders with a
cross-fade. Its `isLoading` overlay is `position:absolute;inset:0` **on
top of** the still-mounted old rows (dimmed via `rgba(3,10,14,.82)` +
`blur(3px)`).

The live site deliberately does not port the client-state
season-switching (see `design/README.md`, "Known, accepted deviations") —
it uses `?year=` + `next/link`, server-rendered per request, same as
Torneos' year filter. This spec extends that existing deviation: the
loading *treatment* is ported (scoped overlay + spinner + label + row
fade-in), but the *mechanism* stays SSR (nested React Suspense, no client
state for the fetch itself).

**Accepted simplification (confirmed with project owner):** because this
is SSR/Suspense rather than client state, the old rows are not still
mounted underneath the loading overlay — the Suspense fallback *replaces*
the table area's content rather than dimming stale content in place. The
overlay is a clean placeholder of roughly the same size, not a literal
overlay-on-top-of-stale-rows like the prototype. This preserves the
"loading is scoped to the table, not the whole page" intent without adding
a client component to hold previous fetch results.

## Architecture

`RankingPage` splits into a fast synchronous-ish shell (hero, season tabs,
competitor count) and a slow, Suspense-wrapped results table — instead of
one function awaiting everything via `withMinDelay`.

```
RankingPage (src/app/ranking/page.js)
  ├─ resolves `anos` (getFiltroAno) and `temporada` — fast, no artificial delay
  ├─ resolves `count` (new getRankingsCount(temporada)) — fast, no artificial delay
  ├─ renders HeroSection: title, eyebrow, <AnimatedCount value={count} />
  ├─ renders <SeasonTabs> (unchanged)
  └─ renders <Suspense fallback={<RankingTableLoading temporada={temporada} />}>
       └─ <RankingTable temporada={temporada} />   (new async Server Component)
            - calls getRankings(temporada), wrapped in withMinDelay (existing 1s floor)
            - renders the existing rows markup (moved as-is, incl. tierBorderClass
              + new top-3 background, fadeDelay/animate-fade-up per row)
```

## Components

### `src/lib/data/{mockDb,supabaseDb}.js` — new `getRankingsCount(temporada)`

Re-exported through `src/lib/data/index.js` and `src/app/utils/db.js`
alongside the existing five functions.

- **`mockDb.js`**: reuses the existing in-memory computation (no real
  latency concern) — can simply compute the same `totals` map as
  `getRankings` and return its size, or call the existing ranking-building
  helper and return `.length`. Exact internal reuse is an implementation
  detail; the two functions must stay consistent (same season → same
  count as `getRankings(temporada).length`).
- **`supabaseDb.js`**: a genuinely cheap query, decoupled from the
  `players`-joined array:
  1. Same "find the latest torneo for this temporada" lookup already at
     the top of `getRankings` (`torneos` table, `.eq('temporada', ...)`,
     order by `fecha_inicio` desc, `.limit(1)`).
  2. `.from('ranking_snapshots').select('player_id', { count: 'exact', head: true }).eq('torneo_id', ultimo.id)`
     — no join, no row data transferred, just the count.
  - Returns `0` if no torneo exists for that temporada (mirrors
    `getRankings`'s `return []` early exit).

This function must **not** be wrapped in `withMinDelay` — its whole
purpose is to resolve quickly, independent of the table's artificial
1-second floor.

### `src/app/ranking/RankingTable.js` (new, async Server Component)

Moved out of `page.js`: calls `getRankings(temporada)` (existing
`withMinDelay` 1s floor preserved), and renders the existing two-column
results markup (`section` with `lg:columns-2`, one row per ranking entry,
`TREND` icon, `fadeDelay`/`animate-fade-up`). Includes the existing empty
state ("No hay rankings todavía para esta temporada.").

**Top-3 background (change within this component):** `tierBorderClass`
in `page.js` today only returns a border color. Add a sibling background
class so rows with `posicion <= 3` render `bg-primary-500/[.16]` instead
of the alternating `bg-white/[.03]` / `bg-white/[.055]` stripe; rows 4+
keep the existing zebra stripe unchanged. Left-border accent logic is
unchanged (already matches the design: cyan top-3 / magenta rest).

### `src/app/ranking/RankingTableLoading.js` (new, Suspense fallback)

Occupies the same layout region as `RankingTable`'s results section
(`max-w-[1240px]` container, comparable min-height so the page doesn't
jump). Contents:

- Dark scrim background, `bg-[rgba(3,10,14,.82)]` with `backdrop-blur-[3px]`.
- Centered spinner: reuses the existing dual-ring primitives from
  `PageLoadingRing.js` (`animate-ring-spin` on a solid `primary-500`
  top-bordered ring, `animate-ring-spin-rev` on a dashed
  `tekken-blue-400/30` ring), scaled down (~48–56px) — not the full
  logo-in-the-middle treatment, just the ring pair.
- Label below: `CARGANDO TEMPORADA {temporada}…` in `font-display`,
  wide tracking, matching the prototype's `loadingLabelStyle`.

No new keyframes needed — `ring-spin` / `ring-spin-rev` already exist in
`tailwind.config.mjs`.

### `src/components/ui/AnimatedCount.js` (new, client component)

Small `"use client"` component: `<AnimatedCount value={number} />`.
Renders `value` inside a `<span>` keyed by `value` — remounting on change
triggers the existing `animate-card-in` keyframe (fade + `translateY(8px)`,
0.35s, already in `tailwind.config.mjs`) for a lightweight "flip in"
transition. No manual `useState`/`useEffect` diffing needed; React's
key-based remount does the work.

Because its value comes from the fast, un-delayed `getRankingsCount`
call, on a season switch the count updates (with its short animation)
well before `RankingTable`'s ~1s-minimum fetch resolves — giving the
"counter updates quickly and animates, table takes its own scoped
loading beat" behavior the project owner asked for.

### `src/app/ranking/page.js` (rewritten)

No longer one big async function feeding `withMinDelay`. Resolves
`anos`/`temporada`/`count` up front (small, fast calls — no
`withMinDelay`), renders `HeroSection` + `SeasonTabs` immediately, and
wraps `<RankingTable temporada={temporada} />` in
`<Suspense fallback={<RankingTableLoading temporada={temporada} />}>`.

## Data flow / consistency

`getRankingsCount(temporada)` and `getRankings(temporada)` must agree on
"how many players are ranked this season" — both derive from the same
`ranking_snapshots` rows for the same `ultimo` torneo. No caching layer
introduced; each is its own Supabase round-trip (acceptable — both are
small, indexed lookups on `torneo_id`).

## Non-goals

- No change to the underlying `getRankings`/`getFiltroAno` query logic
  beyond adding the new sibling `getRankingsCount`.
- No client-side state to preserve/dim previous rows during a season
  switch (see "Accepted simplification" above).
- No change to `SeasonTabs.js` — still `Link`-based, unchanged.
- No changes to the Competidores page's podium or the print/social
  Ranking graphics (`Ranking Liga Tekken Paraguay - Landscape/Portada.dc.html`
  as *graphics*) — this spec only touches the public `/ranking` web page.

## Testing

- Manual verification (dev server + browser): confirm switching season
  tabs shows the scoped spinner/label only over the results area (hero,
  tabs, and counter stay in place and don't flash/reload), rows fade in
  on arrival, and the counter animates to the new value ahead of the
  table.
- Confirm behavior is identical under both `DATA_SOURCE=mock` and
  `DATA_SOURCE=supabase` (both `mockDb.js` and `supabaseDb.js` get the
  new `getRankingsCount`).
- Confirm the empty-season state (`rankings.length === 0`) still renders
  correctly inside `RankingTable`.
- Verify no React "state update after unmount"/hydration warnings from
  `AnimatedCount`'s key-based remount approach.
