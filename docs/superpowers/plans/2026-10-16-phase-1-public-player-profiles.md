# Public Player Profiles Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Give each canonical player a public profile with declared mains, local competitive history and optional free EWGF enrichment.

**Architecture:** Add narrow public projections to the existing mock/Supabase facade, keep editor-only data separate, and use a scheduled cache for EWGF. Profile rendering never depends on an external API request.

**Tech Stack:** Existing Next.js/React JavaScript, Supabase, Playwright and GitHub Actions.

**Spec:** [Design basis, Phase 1](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Apply the design basis and [roadmap release checks](2026-10-16-community-growth-roadmap.md). Tekken 8 only; public pages need no login; `admin` edits and `liga` cannot; never link people by nickname; no paid EWGF endpoint; mocks and Supabase implement the same new interface. Proposed mains/account defaults require review before implementation.

## Review Focus

Merged IDs, multiple accounts and duplicate names; missing results/main/API data; main conflicts during merges; private Tekken IDs; durable quota and upstream failures. Pin them in Tasks 1–3.

### Task 1: Profile metadata, canonical resolution and public data

**Files**

- Create: `src/lib/playerProfiles.js`, `src/lib/playerProfileAdmin.js`, `src/lib/tekkenCharacters.js`.
- Modify: `src/lib/data/{index,mockDb,supabaseDb}.js`, `src/app/api/admin/identidades/fusionar/route.js`, `src/app/api/admin/jugadores/[id]/route.js`, `src/app/api/admin/identidades/jugadores/[id]/detalle/route.js`.
- Generate: additive local migration for profile/account records and the merge operation; do not edit old applied migrations.
- Test: `tests/unit/playerProfiles.test.js`, `tests/integration/playerProfiles.test.js`, `tests/integration/rls.test.js`.

**Interfaces**

- `getPlayerProfile(playerId: string, year?: string) -> Promise<PublicPlayerProfile|null>`; profile contains `{id, displayName, avatarUrl, main, secondaries, season, position, points, tournamentCount, titles, podiums, results, publicTekkenIds}`. Main/position/points may be null; results contain explicit tournament ID/date/placement/points.
- `getPublicPlayerTarget(playerId: string) -> Promise<string|null>` resolves merged IDs safely on the server, at most 10 links with cycle detection. Its privileged query, when needed for hidden merged rows, reads only ID/merge pointer; public profile/result reads remain explicit public projections.
- `savePlayerProfileMetadata(supabase, playerId, {main, secondaries, tekkenAccounts}) -> Promise<void>` validates catalog keys and account ownership. Each account has `{tekkenId, active, isPublic}` with `isPublic=false` by default.
- Retain base-player main during merge; copy other unique characters as secondaries and move Tekken account/cache ownership via stable account IDs. No self-service editing.

- [x] **Step 1 — Write failing behavioral tests.** Fixtures: two different people with the same display name; one person with two Challonge accounts; two Tekken IDs; merged old ID; no results/main; invalid ID. Assert one title for a first-place result, podiums for positions 1–3 only, no win-rate fabrication, and no private fields/IDs in anonymous data. Assert a second main/duplicate character/claimed Tekken ID is rejected.
- [x] **Step 2 — Confirm failure.** Run `npx playwright test tests/unit/playerProfiles.test.js tests/integration/playerProfiles.test.js --project=unit`; new contracts must fail before implementation.
- [x] **Step 3 — Implement schema and contracts.** Add indexed canonical FKs, unique Tekken IDs and one-main partial uniqueness. Keep account privacy/admin notes outside existing anonymously readable players columns. Extend fusion assignments, including existing identity assignments, in a service-only SECURITY INVOKER DB operation/transaction so a failed metadata transfer cannot leave a partially new merge. Preserve existing same-tournament conflict reporting, audit and post-merge ranking recalculation warning. Revoke public/anon/authenticated execution of that internal operation; only the server service client invokes it. Expose merge consequences in the existing confirmation. Invalidate affected profiles/directory/ranking paths.
- [x] **Step 4 — Verify.** Repeat targeted tests plus `npx playwright test tests/integration/rls.test.js tests/integration/importarTorneo.test.js --project=unit`. Include injected failure proving the merge transaction rolls back and direct RPC attempts denied to anon/`liga`. Follow the documented local migration generation/advisor/reconstruction workflow.
- [x] **Step 5 — Commit only this task's reviewed files.** Suggested message: `feat: add canonical public player profile data`.

### Task 2: Public pages and admin editing

**Files**

- Create: `src/app/competidores/[id]/page.js`, `src/app/competidores/[id]/loading.js`, `src/components/players/PlayerSummary.js`, `src/components/players/PlayerResults.js`, `src/components/admin/PlayerCharactersEditor.js`.
- Modify: `src/app/competidores/CompetidoresBoard.js`, `src/app/ranking/RankingTable.js`, `src/app/torneo-resultado/[slug]/page.js`, `src/app/liga/TablasGrupos.js`, `src/app/admin/jugadores/[id]/JugadorDetalle.js`, `src/app/sitemap.js`.
- Test: `tests/e2e/publico/playerProfiles.spec.js`, `tests/e2e/admin/playerProfiles.spec.js`, `tests/e2e/rol-liga/rolLiga.spec.js`; extend existing fixture setup/cleanup for the new records.

**Interfaces:** Page consumes Task 1 DTO; names link using canonical IDs. Admin form consumes/saves the metadata contract through existing authenticated APIs. API responses never send auth user IDs, Discord IDs or raw identity queue data to public pages.

- [x] Write failing e2e assertions for anonymous profile navigation from all four sources, old-ID redirect, unknown-ID 404, unknown main, admin save/reload and `liga` rejection.
- [x] Run those specs under their configured public/admin/role projects and observe the new failures.
- [x] Implement the route, metadata/sitemap and accessible character editor using existing tokens/components. Use local verified portraits; unknown avatars/characters have a stable fallback. Show local tournament finishes without implying set statistics. Keep cards/names usable at 390px with long nicknames.
- [x] Run the targeted e2e specs; manually inspect 390px/1440px, keyboard focus and empty/error states. Complete the common phase checks before releasing the base profile.
- [x] Commit: `feat: publish player profiles and declared mains`.

### Task 3: Optional free EWGF enrichment

**Files**

- Create: `src/lib/ewgf.js`, `src/lib/ewgfSync.js`, `scripts/sync-ewgf.js`, `.github/workflows/sync-ewgf.yml`, `tests/fixtures/ewgf-battles-free.json` after real schema verification.
- Modify: profile server data/presentation, `.env.example` with names only, admin Sistema status for last sync.
- Test: `tests/unit/ewgf.test.js`, `tests/integration/ewgfSync.test.js`.

**Interfaces:** `fetchFreeBattles(tekkenId, {token, fetchImpl}) -> Promise<VerifiedBattleBatch>` and `syncEwgfBatch({supabase, token, clock, maxHourlyRequests:80}) -> Promise<{refreshed, skipped, deferred, failed}>`. `getCachedEwgfSummary(playerId)` returns only a whitelisted public summary or null, never the token/raw cache. Link the server cache to accounts, not mutable names.

- [ ] Inspect one authenticated free response with the user's securely configured key; capture a sanitized fixture and document actual supported fields. With no key, record enrichment deferred and retain a complete base profile release. Do not scrape internal endpoints or generate fictional API fixtures.
- [ ] Write red tests for 50-item normalization/deduplication, 24-hour cache freshness, 80-total-hourly budget across concurrent/restarted/manual runs, UTC quota reset, 429 Retry-After, timeouts, revoked key, 403 newly paid endpoint and corrupt response. Ensure retries consume budget and visitors make zero EWGF requests.
- [ ] Run `npx playwright test tests/unit/ewgf.test.js tests/integration/ewgfSync.test.js --project=unit` and verify failure before code.
- [ ] Implement the free-only adapter, server-only cache/quota state, daily job with a concurrency group and durable checkpoint/lease, injected clock/fetch for tests, and last-good-cache fallback. Distribute additional accounts across hourly windows instead of sleeping a hosted request. Missing key is a disabled integration, not a broken page. Use neutral recent-battle labels until verified fields justify a specific derived metric.
- [ ] Repeat targeted tests, verify the workflow/secret configuration without printing credentials and complete phase checks. Never make live API calls from automated tests.
- [ ] Commit: `feat: cache free EWGF battle enrichment`.


## Registro de ejecución — 2026-10-16

Tareas 1–2 implementadas y verificadas localmente en `feat/community-growth`: lint/build correctos y 223/223 pruebas. Revisión independiente completada, hallazgo importante de cortes del mismo día corregido con regresión RED→GREEN; seguimiento Minor de bigint legacy en el backlog. EWGF (tarea 3) queda diferido por falta de clave/respuesta gratuita verificada, según permite el plan. No se aplicaron migraciones remotas ni se hizo push/deploy. El usuario confirmó mantener la secuencia: esperar el release de fase 1 antes de fase 2. Runbook: `docs/releases/2026-10-16-public-player-profiles.md`.

Auditoría posterior de release: MCP/CLI remoto autenticado, 223/223 + lint/build repetidos correctamente y backup real de producción restaurado con ambas migraciones/fixture ACL. Rama subida con PR #12 en draft y build de Vercel Preview correcto. Bloqueo: falta el secret `SUPABASE_DB_URL`; el workflow anterior ocultaba el dump fallido y generaba archivos vacíos. Fix verificado localmente y en Actions (fallo explícito ante secret ausente). No hubo migración ni deploy de producción. EWGF continúa diferido y fase 2 no iniciada.
