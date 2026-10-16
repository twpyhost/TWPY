# Community Growth Roadmap Implementation Plan

## Ejecución local — 2026-10-16

Fase 1 implementada y verificada localmente (223/223, lint/build, revisión independiente, reconstrucción/restore de migraciones). EWGF diferido conforme al plan. Acceso MCP/CLI remoto restablecido; auditoría nueva confirma cero resultados incompletos de Liga y backup real de producción restaurado localmente con ambas migraciones. Bloqueo actual: falta `SUPABASE_DB_URL` para que el backup programado funcione; se corrigió el workflow que ocultaba el error y producía un archivo vacío. Fases 2–7 no iniciadas. El usuario confirmó esperar el release antes de seguir. Ver `docs/releases/2026-10-16-public-player-profiles.md`. Los casilleros de release de abajo permanecen abiertos porque no hubo publicación.


> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the seven requested improvements in the user's exact priority order, preserving the existing competitive platform and a zero-subscription hosting option for future income.

**Architecture:** Ship seven independently reviewable phases on the existing Next.js/Supabase facade. Keep editorial events separate from tournament imports, reuse canonical players and stored snapshots, and make EWGF an optional scheduled enrichment. Move commercial hosting before enabling sponsored placements in Phase 7.

**Tech Stack:** Next.js 16, React 19, JavaScript, Tailwind, Supabase, Challonge, Playwright, GitHub Actions; Netlify Free is the verified commercial-host candidate.

**Spec:** [Design basis](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

All constraints in the design basis apply to every linked plan. In particular: Tekken 8 only; canonical identity is never name matching; public read access requires no login; `liga` cannot edit profiles/content/partners; Liga never feeds annual snapshots; maintain mock/Supabase parity; no paid API endpoint or automatic upgrade; test only against local Supabase; keep the daily real DB query and backups operational.

This is a planning deliverable, not an instruction to start implementation automatically. Detailed choices in the spec are labeled planning defaults. No launch date or workload estimate is a commitment.

## Review Focus

1. Identity merges and multiple online accounts preserve history and a single canonical public profile — Phase 1 integration tests.
2. Published versus draft/private records remain separated at DB, route, media and cache boundaries — Phases 2, 6 and 7 RLS/anonymous-read tests.
3. Same-date ranking cuts, missing snapshots and prior-season boundaries retain stored meaning — Phase 3 tests.
4. Unlinked Liga participants, stale remembered selections and sanctioned results behave correctly — Phase 4 tests.
5. API quota exhaustion and hosting credit exhaustion cannot silently upgrade billing or disable the only DB keep-alive — Phases 1 and 7 checks.

## Phase sequence and deliverables

| Order | Deliverable | Depends on | Relative size | Detailed plan |
| --- | --- | --- | --- | --- |
| 1 | Canonical public player profiles, mains/secondaries, optional cached free EWGF battles | Existing players/results | Large | [Phase 1](2026-10-16-phase-1-public-player-profiles.md) |
| 2 | Upcoming events, event details, admin publishing, calendar feed | Phase 1 released; existing admin roles | Medium | [Phase 2](2026-10-16-phase-2-upcoming-event-hub.md) |
| 3 | Standings after each tournament and player ranking timelines | Phase 1 profiles; existing snapshots | Medium | [Phase 3](2026-10-16-phase-3-ranking-history.md) |
| 4 | Find a participant's Liga schedule/results without login | Phase 1 profile links; existing league bundle | Small | [Phase 4](2026-10-16-phase-4-find-my-liga-matches.md) |
| 5 | Downloadable podium/player-season images and share links | Phases 1–3 public projections | Medium | [Phase 5](2026-10-16-phase-5-shareable-results-cards.md) |
| 6 | Curated recaps/photos/VODs, publication and media backups | Phase 2 event links; existing results | Large | [Phase 6](2026-10-16-phase-6-community-archive.md) |
| 7 | Commercial-host cutover and managed partner/sponsor placements | Phases 2, 5, 6; hosting proof first | Large | [Phase 7](2026-10-16-phase-7-partnerships-and-sponsorships.md) |

Size compares scope and integration risk; it is not elapsed time. Keep releases in this order even where phases are technically independent. Optional EWGF enrichment may be deferred within Phase 1 if no free key is available; record it as deferred rather than treating unverified external data as shipped.

If an earlier phase promotes paid event registration or other commercial content, run Phase 7 Task 1 as a hosting prerequisite before publishing it. This changes infrastructure timing, not the seven-feature priority order. Do not assume sponsorship is the only way a site can become commercial.

## Start-of-execution baseline

- [ ] Read `AGENTS.md`, `docs/estado-desarrollo.md`, this spec and the current phase plan. Inspect status before editing; the worktree already contains unrelated local Liga/test/documentation changes.
- [ ] Establish an isolated branch/worktree at execution time without discarding existing work. Preserve the uncommitted Liga migration and follow its documented production release prerequisite; do not apply it remotely as part of planning.
- [ ] Record local lint/build/test results as the baseline. Resolve only actual release blockers; do not pull the whole tech-debt backlog into these phases.
- [ ] Confirm the local database migration history and a usable backup/restore path before additive schema work. Protect test/dev separation and one-worker Playwright behavior.
- [ ] Review proposed visual layouts against `design/README.md` and live DesignSync sources during each feature's design pass; original prototype files are not local.

## Common task cycle and phase exit

For each task in each linked plan:

1. Add the named regression/acceptance tests and confirm the relevant failure before implementing behavior. A documentation-only/configuration task uses a direct check instead of artificial tests.
2. Implement the scoped data contract and UI with existing conventions. No feature-wide rewrites.
3. Run its targeted tests. At phase exit run `npm run lint`, `npm run build` and `npm test` once against the local stack; follow up only on failures/new changes. Record actual results, not the historic 203-test baseline as a future count.
4. Check public mobile layouts at 390px and desktop at 1440px, keyboard navigation, empty/loading/error states, labels and reduced-motion behavior where motion is used. Visually inspect generated cards separately.
5. Review data exposure and role boundaries. For schema changes, run advisors, review generated migrations and prove a fresh migration reconstruction/fixture restore without resetting the working development DB.
6. Update `docs/qa/casos-de-prueba.md`, `docs/qa/plan-de-pruebas.md` and `docs/estado-desarrollo.md` with the actual new behavior; append real deferred findings to `docs/tech-debt-backlog.md`.
7. Commit only the current phase's reviewed files. Release a working phase before starting the next; keep production migration/configuration operations explicit and documented.

## Hosting decision, verified 2026-10-16

**Recommended candidate: Netlify standard Free.** Its provider explicitly allows commercial projects. [Official confirmation](https://www.netlify.com/guides/netlify-vs-vercel/). This satisfies the income-permission requirement; it does not prove this repository has already deployed there.

Netlify's documented Next.js adapter supports the major runtime features this app needs. [Next.js support](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). Verify the installed Next.js release, `src/proxy.js`, Supabase cookies, SSR/ISR, route handlers and card rendering in Phase 7 before cutover.

The Free plan provides 300 monthly credits with a hard cap; additional hosting team seats and some private-repository workflows are restricted. [Free-plan details](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/). Community admins use Supabase roles inside TWPY, so they do not each need a hosting seat. Prove the actual repository/CI deployment route rather than assuming Free covers an organization-owned private repo.

Credits currently meter production deploys, bandwidth, web requests and compute; exhausted credit pauses sites. [Accounting and pause behavior](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/). Target no more than 200 modeled credits/month, leaving 100 for variation. This is a project budget, not a provider guarantee. Prefer preview deploys while developing, cache public data/cards and keep VOD hosting external.

During Phase 7, decouple the daily Supabase activity query from frontend availability so a Netlify pause cannot also pause the database. Keep backup execution independent and update `SITE_URL`, auth callback allowlists, site metadata and DNS as a single reviewed cutover. No production fallback to non-commercial Vercel Hobby while paid placements are active.

## Decisions to settle at the relevant phase

These are recorded inputs, not reasons to interrupt creating the roadmap:

- Phase 1: confirm the admin-maintained declared-main default, public Tekken IDs and free API response fields/key. Profiles can launch without EWGF.
- Phase 2: supply the public organizer contact, actual event details and registration destinations.
- Phase 5: approve the two card templates after viewing real long-name/tied-placement examples.
- Phase 6: approve curated publishing/media credits and verify the actual backup storage budget.
- Phase 7: confirm sponsor contact channel, deliverables, prices, admin compensation/revenue allocation, and hosting deployment ownership. Publish no invented sponsor or audience statistic.

## Completion record

- [ ] Phase 1 released and verified.
- [ ] Phase 2 released and verified.
- [ ] Phase 3 released and verified.
- [ ] Phase 4 released and verified.
- [ ] Phase 5 released and verified.
- [ ] Phase 6 released and verified, including a media restore.
- [ ] Phase 7 released only after commercial hosting proof/cutover, independent keep-alive and explicit sponsor agreement activation.
