# Ranking History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let visitors inspect annual standings after each tournament and follow a player's recorded season progression.

**Architecture:** Read existing `ranking_snapshots` in the same tournament order used by `src/lib/rankings.js`. Add narrow history facade methods without changing the existing latest-ranking functions or ranking math.

**Tech Stack:** Existing Next.js/React JavaScript, Supabase, SVG/HTML and Playwright.

**Spec:** [Design basis, Phase 3](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Run after Phases 1–2. Apply the design basis and [common phase checks](2026-10-16-community-growth-roadmap.md). Snapshots are the authority; Liga/EWGF data cannot contribute; preserve points/tie rules; keep current season URLs working; provide a table alternative to any chart. No schema change is expected.

## Review Focus

Two tournaments on the same date; first cut of a season; missing snapshot versus zero points; corrected identities/reimports; an explicit cut ID belonging to another season. Pin these in Tasks 1–2.

### Task 1: Snapshot query/projection contracts

**Files**

- Create: `src/lib/rankingHistory.js`.
- Modify: `src/lib/data/{index,mockDb,supabaseDb}.js`.
- Test: `tests/unit/rankingHistory.test.js`, `tests/integration/rankingHistory.test.js`; retain `tests/integration/recalcularSnapshots.test.js` unchanged unless an actual regression needs coverage.

**Interfaces**

- `getRankingCuts(year: string) -> Promise<Cut[]>` where `Cut={tournamentId:string,title,date,season:string,available:boolean}` sorted by date then numeric tournament ID. Compare bigint IDs without lossy Number conversion.
- `getRankingAtCut({year, tournamentId}) -> Promise<{cut,previousCut,rows}|null>`; null means invalid/mismatched cut, unavailable means the selected real cut has no snapshot. Rows retain stored `{playerId, name, position, points, movement}`; movement compares the preceding actual cut of this season and remains unknown if that preceding snapshot is unavailable.
- `getPlayerRankingHistory(playerId, year) -> Promise<Array<{tournamentId,date,position:number|null,points:number|null,available:boolean}>>`. A player not yet ranked has null values, never an invented position 0. A ranked player absent from one event may still have a carried-forward snapshot.
- Pure `projectRankingHistory({cuts,snapshots,playerId})` constructs that series without writes.

- [ ] Add a red test with cuts 10 and 11 on the same date and cut 12 on a later date. Assert stored positions/points are preserved, cut 11 follows cut 10, nulls break missing-data series and the first cut does not compare to last year's rank. Add wrong-season cut rejection and a player carrying points through an event they missed.
- [ ] Run `npx playwright test tests/unit/rankingHistory.test.js tests/integration/rankingHistory.test.js --project=unit` and confirm the new interface fails.
- [ ] Implement ordered snapshot reads/projection in both facade sources. Reuse public canonical names and existing movement semantics. Fetch per selected season/cut rather than N+1 queries per player, and never recalculate on a public GET. Record any missing historical data for admin investigation without silently backfilling during reads.
- [ ] Repeat tests plus `npx playwright test tests/integration/recalcularSnapshots.test.js --project=unit`. Verify the history read does not mutate snapshots, points configuration or raw participants.
- [ ] Commit: `feat: expose stored ranking history`.

### Task 2: Historical standings and profile timeline

**Files**

- Create: `src/app/ranking/CutSelector.js`, `src/components/players/RankingTimeline.js`.
- Modify: `src/app/ranking/page.js`, `src/app/ranking/RankingTable.js`, `src/app/ranking/RankingTableBoundary.js`, `src/app/competidores/[id]/page.js`; extend the existing search-param transition mechanism only if required.
- Cache invalidation write sites: `src/app/api/admin/insertar_torneo/route.js`, `src/app/api/admin/torneos/[id]/route.js`, `src/app/api/admin/torneos/[id]/reimportar/route.js`, `src/app/api/admin/identidades/vincular/route.js`, `src/app/api/admin/identidades/crear_jugador/route.js`, `src/app/api/admin/identidades/fusionar/route.js`, `src/app/api/admin/identidades/deshacer/route.js`, `src/app/api/admin/rankings/recalcular/route.js`. Verify whether existing invalidation already covers each path before changing it.
- Test: `tests/e2e/publico/rankingHistory.spec.js`, `tests/e2e/publico/playerProfiles.spec.js`.

**Interfaces:** `/ranking?year=2026&torneo=10` selects the explicit historical cut; `?year=2026` retains the latest-cut behavior. A season change clears `torneo`; an explicit invalid/mismatched cut displays a clear unavailable/invalid-selection state instead of showing another tournament under the requested label. `RankingTimeline({series})` has an accessible table and renders no connecting line across null gaps.

- [ ] Write red browser cases for copied historical URLs, back/forward, season changes, first cut, unavailable cut, a long player name and selecting the already-active cut without an unnecessary navigation. Ensure loading labels reflect the requested cut and scroll remains stable.
- [ ] Run the history public spec and confirm the new behavior fails.
- [ ] Implement cut selection and the profile timeline using existing design components. Use simple responsive SVG plus HTML table rather than adding a chart dependency. Clearly label the selected tournament/date and explain that history can change after corrected results/identities.
- [ ] Repeat targeted specs, inspect keyboard/mobile chart/table behavior and complete common phase checks. Invalidate these reads when existing import/reimport/identity/recalculation actions change snapshots; add the appropriate path/tag invalidation at those existing write sites.
- [ ] Commit: `feat: browse ranking cuts and player timelines`.
