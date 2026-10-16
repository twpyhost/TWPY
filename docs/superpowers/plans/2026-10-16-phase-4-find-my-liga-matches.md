# Find My Liga Matches Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a visitor immediately find one participant's group, results and remaining Liga matches without signing in.

**Architecture:** Derive a small participant view from the existing `getLiga(slug)` bundle, then provide a client selector with URL/local-storage persistence. Keep the server-rendered full league usable without client storage.

**Tech Stack:** Existing Next.js/React JavaScript and Playwright; no new service or DB table.

**Spec:** [Design basis, Phase 4](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Run after Phase 3. Apply the design basis and [release cycle](2026-10-16-community-growth-roadmap.md). A Liga participant ID is not a canonical player ID. No login or automatic name matching. Preserve FT3 scoring, sanctions, standings and closed-group rules; never write annual rankings. League-specific remembered state stays on the device.

## Review Focus

Unlinked participants and duplicate names; participant with no scheduled match on a date; A/B score orientation; sanctioned versus pending matches; malformed/stale URLs or unavailable localStorage. Tests in both tasks cover these cases.

### Task 1: Pure participant schedule projection

**Files:** Create `src/lib/ligaPlayerView.js` and `tests/unit/ligaPlayerView.test.js`. Consume `src/lib/ligaData.js` output without changing its scoring logic.

**Interfaces:** `getLigaPlayerView(ligaBundle, participanteId:string) -> {participant,group,standing,upcoming,completed,restDates}|null`. Match records expose `{id,fechaNumero,date,time,opponentId,opponentName,scoreFor,scoreAgainst,status,profileId}`. Status is `pendiente`, `jugado` or `sancionado`; scores are null for pending, oriented from the selected participant for played, and 0–0 for sanctioned. A participant's profileId may be null. Treat IDs as strings at the projection boundary.

- [ ] Write a red fixture test with participant A unlinked, participant B linked, a 3–1 result with selected participant on side B, a sanctioned 0–0, a pending set and an unscheduled/rest date. Assert duplicate names cannot change the chosen person, pending/sanctioned are distinct and source objects are not mutated.
- [ ] Run `npx playwright test tests/unit/ligaPlayerView.test.js --project=unit`; observe failure before implementation.
- [ ] Implement the projection using existing participant IDs, fecha metadata and standings. Determine rest dates only for dates on which that participant's group has scheduled sets; do not label all dates of other groups as rests. Never recompute points from online data or count sanctions as wins.
- [ ] Repeat the new test and existing Liga table unit tests.
- [ ] Commit: `feat: derive a participant Liga schedule`.

### Task 2: Selector, shareable URL and remembered preference

**Files:** Create `src/app/liga/MisPartidosLiga.js`, `src/lib/ligaPreference.js`, `tests/unit/ligaPreference.test.js`. Modify `src/app/liga/page.js` and extend `tests/e2e/publico/liga.spec.js` with locally seeded fixtures/cleanup.

**Interfaces:** `resolveLigaSelection({slug,urlParticipantId,storedParticipantId,validIds}) -> {selectedId,source,invalidUrl,clearStored}`; local key `twpy:liga:<slug>:participante`. `MisPartidosLiga({liga,initialParticipantId})` consumes the existing bundle; selecting sets/replaces `?participante=<id>` while preserving unrelated URL params. URL wins; no URL may fall back to valid stored state. A stale explicit URL shows an invalid-selection message rather than silently picking another player.

- [ ] Add red tests for copied links, reload persistence, invalid/stale URL and stored value, clearing selection, a different league slug, localStorage throwing, no canonical profile link for an unlinked participant and keyboard-only selection.
- [ ] Run `npx playwright test tests/unit/ligaPreference.test.js --project=unit` and `npx playwright test tests/e2e/publico/liga.spec.js --project=e2e`; verify new assertions fail.
- [ ] Implement the selector/result view and safe client-side persistence. Avoid a server round trip to refetch the same league on every selection; use client URL state synchronized with back/forward. Hydration must render a stable initial state before applying storage. Full group/calendar views remain usable and server-shared data never depends on a visitor's local preference.
- [ ] Repeat tests, inspect 390px fixtures/opponent labels and complete common phase checks. Verify no additional Supabase or EWGF request occurs when changing the selected participant.
- [ ] Commit: `feat: find and remember my Liga matches`.
