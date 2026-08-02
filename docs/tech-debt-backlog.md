# Tech Debt & Deferred Work Backlog

Real, non-blocking findings from code review or implementation work that
were correctly deferred rather than expanding the scope of the task that
surfaced them. This doc exists so they survive between sessions instead of
living only in a conversation or a deleted SDD workspace ledger.

Grouped by the feature/date that surfaced the items. Append new groups at
the bottom; don't renumber or delete old ones — mark an item's Status
instead once it's picked up.

**Entry template:**

- **What**: one-line summary
  **Where**: `path/to/file.js:line`
  **Why it matters**: the concrete risk/cost of leaving it as-is
  **Proposed fix**: what doing it would look like
  **Status**: Open | In progress | Done (commit/PR)

---

## 2026-08-02 — Torneos year-filter loading parity

Surfaced during the final whole-branch review of
[`docs/superpowers/plans/2026-08-02-torneos-season-loading.md`](superpowers/plans/2026-08-02-torneos-season-loading.md),
which gave `/torneos`' year filter the same instant-feedback, scoped-loading
behavior `/ranking`'s season selector already had.

1. **What**: Duplicated spinner markup between ranking and torneos.
   **Where**: `src/app/ranking/RankingTableLoading.js`,
   `src/app/torneos/TorneoListLoading.js`
   **Why it matters**: Task 1 of the plan extracted the shared *mechanism*
   (the `useTransition`/`useOptimistic` transition logic) into
   `src/components/ui/SearchParamTransitionProvider.js`, but the *visual*
   spinner (the two `animate-ring-spin`/`animate-ring-spin-rev` rings plus
   label styling) is copy-pasted verbatim between the two loading
   components, just with a different label/wrapper. A future style change
   to one won't propagate to the other.
   **Proposed fix**: Extract a shared `ScopedLoading({ label })` into
   `src/components/ui/`, have both `RankingTableLoading` and
   `TorneoListLoading` render it (each keeps its own outer
   wrapper/section, since ranking's replaces a whole section and torneos'
   sits inside one already).
   **Status**: Open

2. **What**: Modifier-click guard duplicated 3 times.
   **Where**: `src/app/ranking/SeasonTabs.js`,
   `src/app/torneos/TorneoYearTabs.js`, `src/components/ui/PageTransition.js`
   **Why it matters**: All three sites carry the identical six-condition
   check (`defaultPrevented || button !== 0 || metaKey || ctrlKey ||
   shiftKey || altKey`) that lets ctrl/cmd/shift/middle-click and "open in
   new tab" fall through to native browser handling instead of being
   hijacked into a client transition. At three copies, a future change to
   the rule requires remembering to update all three.
   **Proposed fix**: Extract a shared `isPlainLeftClick(event)` helper into
   `src/lib/`, use it from all three sites.
   **Status**: Open

3. **What**: No test coverage for the "Todos"/all-years loading label.
   **Where**: `src/app/torneos/TorneoListLoading.js` (the
   `year === "all"` branch), `tests/e2e/publico/torneos.spec.js`
   (`TC-TOR-008`)
   **Why it matters**: `TC-TOR-008` only clicks a specific year and
   asserts the "CARGANDO TEMPORADA {year}" label; nobody clicks "Todos"
   and asserts "CARGANDO TODOS LOS TORNEOS", so that branch is currently
   unexercised by any test.
   **Proposed fix**: Add a step to `TC-TOR-008` (or a new case) that
   clicks a year, then clicks "Todos", and asserts the observed spinner
   text says "TODOS" and never a year.
   **Status**: Open

4. **What**: `navigate()` has no same-value guard.
   **Where**: `src/components/ui/SearchParamTransitionProvider.js`
   **Why it matters**: Re-clicking the pill/tab you're already on still
   pushes the same URL and runs the full transition — on `/torneos` that
   means a real ~1s+ round trip (see item 7) and spinner for a no-op
   click. Pre-existing on `/ranking` too, not introduced by this feature,
   but now duplicated onto a second page.
   **Proposed fix**: In `navigate(href, nextValue)`, short-circuit if
   `nextValue === valorMostrado` (the current optimistic value) before
   calling `setValorOptimista`/`router.push`. Fixes both pages at once
   since they share the module.
   **Status**: Open

5. **What**: Misleading code comment about `loading.js`.
   **Where**: `src/components/ui/SearchParamTransitionProvider.js`
   **Why it matters**: The comment says "there's no loading.js for these
   segments" as part of the rationale for the whole mechanism. True for
   `/ranking` and `/torneos` specifically (neither has its own route-local
   `loading.js`), but the repo does have a root `src/app/loading.js` — a
   maintainer who greps for `loading.js` and finds it may doubt the
   comment.
   **Proposed fix**: Add one clarifying clause, e.g. "no *route-local*
   loading.js for these segments; the root app/loading.js boundary isn't
   re-entered for same-segment searchParam changes."
   **Status**: Open

6. **What**: No accessibility signaling on active pills/tabs or spinners.
   **Where**: `src/app/ranking/SeasonTabs.js`,
   `src/app/torneos/TorneoYearTabs.js`,
   `src/app/ranking/RankingTableLoading.js`,
   `src/app/torneos/TorneoListLoading.js`
   **Why it matters**: No `aria-current` on the active pill/tab, no
   `role="status"`/`aria-live` on either spinner — screen-reader users get
   no announcement that a filter changed or that content is loading.
   Pre-existing on ranking; this feature duplicated the pattern onto
   torneos rather than introducing it.
   **Proposed fix**: Add `aria-current="true"` to the active pill/tab in
   both `SeasonTabs.js` and `TorneoYearTabs.js`; add `role="status"` +
   `aria-live="polite"` to both loading components. Do both pages together
   so the pattern stays consistent.
   **Status**: Open

7. **What** (larger, product-level): `/torneos`' year filter shows a
   spinner for latency the page inflicts on itself.
   **Where**: `src/app/torneos/page.js`, `src/lib/withMinDelay.js`
   **Why it matters**: `page.js` already fetches *all* tournaments up
   front and filters them in memory (`filtered = sorted.filter(...)`) —
   the year filter needs zero new data from the server. Yet every click
   still pays a real RSC round trip, with `withMinDelay`'s default 1000ms
   floor stacked on top (a knob meant to keep a genuinely-loading state
   visible long enough to see, which is in tension with a page that
   already has everything it needs). The new loading spinner (this
   feature) makes that self-inflicted latency feel intentional rather
   than fixing it.
   **Proposed fix**: Decide between (a) dropping `withMinDelay` for this
   page's fetch, or (b) filtering client-side (ship all tournaments to the
   client once, filter in the browser) so switching years is instant and
   the spinner becomes unnecessary. This is a product call, not a bug fix
   — write it up as its own spec if pursued.
   **Status**: Open

8. **What**: Stale filename reference in `TODO.todo`.
   **Where**: `TODO.todo` (2 lines, in the ranking season-selector `HECHO`
   entry)
   **Why it matters**: Still says `SeasonTransitionProvider`, the module's
   name before this feature's Task 1 renamed/moved it to
   `SearchParamTransitionProvider` (`src/components/ui/SearchParamTransitionProvider.js`).
   Harmless, just stale.
   **Proposed fix**: Update the two references next time `TODO.todo` is
   touched.
   **Status**: Open
