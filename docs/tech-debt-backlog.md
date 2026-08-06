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

---

## 2026-08-06 — Desempate manual (admin) rediseño

Surfaced across the 5 task reviews and the final whole-branch review of
[`docs/superpowers/plans/2026-08-06-liga-desempate-admin.md`](superpowers/plans/2026-08-06-liga-desempate-admin.md),
which reworked the manual tie-break UI in `/admin/liga/grupo/[numero]` (local
draft reorder, explicit Confirmar/Descartar, and a guard blocking closing a
group with unresolved ties).

1. **What**: Confirmar/Descartar don't check `grupo.cerrado` (pre-existing
   gap, not introduced by this plan — the `PUT /desempate` endpoint itself
   has never checked `cerrado` either).
   **Where**: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js` (the
   Confirmar/Descartar buttons, unlike the ↑/↓ arrows, don't disable on
   `grupo.cerrado`); `src/app/api/admin/liga/grupos/[numero]/desempate/route.js`
   (no `cerrado` check at all).
   **Why it matters**: A narrow but real sequence bypasses "a closed group
   rejects changes" (the exact invariant `TC-LIGA-ADMIN-002` tests for match
   results): create a local reorder draft on an already-resolved block
   (no `empatado`, so closing isn't blocked), close the group without
   confirming that draft, then click the still-visible Confirmar — it
   succeeds and rewrites `orden_desempate` on a closed group.
   **Proposed fix**: Add a `cerrado` check to the `PUT /desempate` route
   (mirroring the one added to `PUT /cerrar` in Task 2 of the plan above),
   and disable Confirmar/Descartar in the UI when `grupo.cerrado` is true,
   same as the arrows already do.
   **Status**: Open

2. **What**: `claveBloque(grupo.tabla, bloque)` recomputed up to 5x per row
   that has arrows/Confirmar/Descartar visible.
   **Where**: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js` (disabled
   checks on both arrows, both Confirmar/Descartar, plus inside
   `hayCambiosPendientes`).
   **Why it matters**: Harmless at this table's size (groups of ~7), but a
   `const clave = bloque ? claveBloque(grupo.tabla, bloque) : null;` once
   per row would read cleaner and avoid the repetition.
   **Proposed fix**: Hoist the one computation to the top of each row's
   render and reference it everywhere in that row.
   **Status**: Open

3. **What**: `!grupo.cerrado && hayEmpatesPendientes` repeated verbatim 3x.
   **Where**: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js` (the
   "CERRAR GRUPO" button's `disabled`, `title`, and the warning `<p>`'s
   render guard).
   **Why it matters**: Trivial style nit — the three copies are adjacent
   and easy to keep in sync, but a single named `const` would remove the
   duplication entirely.
   **Proposed fix**: `const bloqueadoPorEmpate = !grupo.cerrado && hayEmpatesPendientes;`
   once, reuse it in all three spots.
   **Status**: Open

4. **What**: No test pins "a local reorder draft is NOT persisted until
   Confirmar is clicked" independently of the persistence-after-reload test.
   **Where**: `tests/e2e/admin/ligaDesempate.spec.js`
   (`TC-LIGA-DESEMPATE-003` covers "confirm persists across reload" but
   nothing reloads *before* confirming to prove the draft alone changed
   nothing server-side).
   **Why it matters**: This is the literal bug this whole feature exists to
   fix (arrows used to save on every click); reading the code confirms
   `moverEnDraft` never calls `fetch`, but no test would catch a future
   regression that made drafts auto-save.
   **Proposed fix**: In `TC-LIGA-DESEMPATE-003` (or a new test), move a row,
   `page.reload()` *before* clicking Confirmar, and assert the original
   (pre-move) order is what comes back.
   **Status**: Open
