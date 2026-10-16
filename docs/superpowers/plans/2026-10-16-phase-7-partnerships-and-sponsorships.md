# Partnerships and Sponsorships Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Offer manageable paid/in-kind community partnerships on hosting that explicitly permits income without a subscription fee.

**Architecture:** First prove and migrate the existing dynamic Next.js app to Netlify standard Free, retaining Supabase and independent scheduled operations. Then publish bounded partner placements from public DTOs, keeping business terms private and payments manually arranged.

**Tech Stack:** Existing Next.js/React JavaScript, Supabase, GitHub Actions, Playwright and Netlify's maintained OpenNext adapter.

**Spec:** [Design basis, Phase 7](../specs/2026-10-16-community-growth-roadmap-design.md).

## Global Constraints

Run after Phase 6. Apply the design basis and [release cycle](2026-10-16-community-growth-roadmap.md). No paid placement activates before commercial hosting passes its checks. No account purchase/auto-upgrade, sponsor outreach, payment gateway, automated payout, invented sponsor or guaranteed audience/revenue. Supabase `liga` cannot administer partners. Partner status cannot alter competitive records or order.

Task 1 alone may run earlier as an infrastructure prerequisite if the event hub will promote paid entries or another earlier phase becomes commercial. The partnership feature itself remains seventh. Recheck EWGF's free-plan usage terms when monetizing; disable its optional enrichment if commercial use would require payment rather than upgrading automatically.

## Review Focus

Free-tier exhaustion, actual private-repository/CI eligibility, proxy/cookie and image-renderer compatibility, leaked private agreement terms, and sponsor expiry/retraction in cached pages/cards. Tasks 1–3 own these checks.

### Task 1: Verify free commercial hosting and preserve operations

**Evidence, checked 2026-10-16**

- Netlify explicitly allows commercial projects on its standard Free plan: [provider confirmation](https://www.netlify.com/guides/netlify-vs-vercel/).
- Its adapter documents App Router, SSR/ISR, route handlers, image optimization and middleware support: [Next.js documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/). This is a documented candidate, not a claim that this repository has deployed successfully.
- Standard Free has 300 credits/month, a hard cap and no auto-recharge; hosting collaboration/private-repository restrictions apply: [plan documentation](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/). These restrictions are separate from admins using Supabase roles inside TWPY.
- Production deployments currently use 15 credits each, bandwidth 20/GB, requests 2/10,000 and compute 10/GB-hour; exhausting the balance pauses sites: [credit accounting](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).

**Files**

- Create if required after a deployment proof: `netlify.toml`; add scripts `scripts/check-supabase-health.js` and `scripts/record-backup-status.js`.
- Modify: `.github/workflows/keep-supabase-alive.yml`, `.github/workflows/backup-supabase.yml`, relevant archive backup reporting, `.env.example` (names only), `docs/infrastructure.md`, `README.md` and deployment runbook `docs/netlify-deployment.md`.
- Inspect/modify only as proved necessary: `next.config.mjs`, `src/proxy.js`, Supabase callback/session handlers and Phase 5 card rendering.
- Test: `tests/unit/supabaseHealth.test.js`; host smoke checklist in the deployment runbook.

**Interfaces:** `checkSupabaseHealth({url,anonKey,fetchImpl}) -> Promise<{ok:boolean}>` makes the same real, read-only `juegos` query as the existing health route, directly against Supabase. Daily workflow invokes this before any optional site ping. `recordBackupStatus({dbOrServiceClient,outcome,runId})` records an actual completed/failed backup without requiring the frontend; never permits anonymous event writes.

- [ ] Recheck all provider links at execution time and record plan/limits/date. Verify the actual repository owner/visibility and Git/CI/artifact deploy route. Do not make a private repository public or share an owner login to satisfy Free restrictions. If a zero-cost deployment route fails, keep the paid-placement launch gate closed and report the precise constraint; do not silently buy Pro.
- [ ] Configure a Free preview with explicit server/build env scopes and pinned app dependencies. Start with mock public pages, then test auth/writes against a reachable nonproduction Supabase instance. Never run the e2e mutation suite against production. Prove installed Next.js compatibility, `src/proxy.js` session refresh/cookies, role boundaries, SSR/streaming, ISR invalidation, callback redirects, `next/image`, all four PNG variants and server-only API keys. Consult adapter logs instead of relying on advertised feature parity.
- [ ] Add a failing unit check where frontend fetch fails but the direct Supabase query succeeds. Implement host-independent keep-alive and backup status reporting. Run `npx playwright test tests/unit/supabaseHealth.test.js --project=unit`; verify site unavailability cannot skip the DB query or the actual dump/media backup.
- [ ] Measure representative page/card/admin usage and forecast a month including deploys. Project budget: <=200 of the 300 credits, leaving 100 headroom. Illustrative arithmetic only: 6 production deploys (90), 3 GB transfer (60), 100,000 requests (20), 1 GB-hour compute (10) =180 credits. Assets/route calls count too; 50 members alone does not establish usage. Use previews for iteration and keep videos external. No paid add-ons/recharge.
- [ ] Write and execute a reviewed cutover checklist: verified backup, production env scopes, selected auth redirect allowlists, custom domain/TLS, canonical SITE_URL/metadata/sitemap, GitHub Actions SITE_URL, health/backup/API sync and DNS. Test a real admin login plus a harmless read on the production domain; mutation acceptance remains nonproduction. Preserve old DNS/deployment details for rollback, but disable all commercial placements before any rollback to Vercel Hobby.
- [ ] Commit configuration/runbook and record actual host verification. This task is complete only when a zero-subscription commercial deployment is proved; documentation research alone does not clear the launch gate.

### Task 2: Partner records and private admin workflow

**Files**

- Create: `src/lib/partners.js`, `src/app/admin/patrocinadores/page.js`, `src/app/admin/patrocinadores/Patrocinadores.js`, `src/app/api/admin/patrocinadores/route.js`, `src/app/api/admin/patrocinadores/[id]/route.js`.
- Modify: `src/components/admin/AdminShell.js`, `src/lib/data/{index,mockDb,supabaseDb}.js`.
- Generate: additive local migration for `partners`, public placement/campaign fields and separate private agreement terms. Public identifiers are UUIDs. Add indexed optional event/season scopes, validated start/end, status, support type and deterministic order.
- Test: `tests/unit/partners.test.js`, `tests/integration/partners.test.js`, `tests/e2e/admin/patrocinadores.spec.js` and role suite.

**Interfaces**

- `getActivePartners({placement:'site'|'event'|'season',eventId?,season?,at}) -> Promise<PartnerPublic[]>` filters only explicitly published active campaigns where `startsAt <= at < endsAt` and the requested scope matches.
- Public DTO: `{id,name,description,logo,websiteUrl,supportType,placement,eventId,season,startsAt,endsAt}`; private fees, contacts, contractual notes and compensation split stay out of this DTO/table's public projection. Logo assets use the validated media handling from Phase 6 with a separate partner association; unpublished logos cannot leak through archive policies.
- `validateCampaign(input)` rejects unsafe links, invalid intervals and contradictory scopes. Draft/pause/end/publish transitions are admin-only.

- [ ] Write red tests for interval endpoints, timezone boundary, unpublished/paused campaign, unrelated event/season, draft logo, unsafe URL, `liga` write and direct anonymous reads of fee/contact/notes. Include expired output already in a shared-card cache.
- [ ] Run `npx playwright test tests/unit/partners.test.js tests/integration/partners.test.js --project=unit` and confirm failure.
- [ ] Implement the records, RLS/private terms, scoped asset authorization and admin editor. Store quoted fee/support/revenue allocation as private business records only after admins choose them; do not compute or transfer payouts. Show website/event/season deliverables as editable agreements, not automatic promises about social channels.
- [ ] Repeat targeted tests and admin/role browser specs; follow local advisor/migration reconstruction checks. Verify record creation has no effect on ranking/results data.
- [ ] Commit: `feat: manage community partnership agreements`.

### Task 3: Public partners and sponsor attribution

**Files**

- Create: `src/app/patrocinadores/page.js`, `src/components/partners/PartnerStrip.js`.
- Modify: `src/app/page.js`, `src/components/footer.js`, `src/components/navbar.js`, `src/app/eventos/[slug]/page.js`, `src/app/archivo/[slug]/page.js`, `src/lib/shareCards.js`, `src/components/share/TournamentCard.js`, `src/components/share/PlayerSeasonCard.js`, `src/app/sitemap.js`.
- Test: `tests/e2e/publico/patrocinadores.spec.js`, `tests/unit/shareCards.test.js`, `tests/e2e/publico/shareCards.spec.js`.

**Interfaces:** `PartnerStrip({partners})` shows `Patrocinado` for paid support and `Colaborador` for in-kind support, with safe labeled outbound links. Public contact destination is admin-configured; omit contact action until configured rather than publishing a guessed personal number. Card sponsor data is fetched by the server from Task 2, never supplied as arbitrary public query text.

- [ ] Add red cases for commercial-host launch gate disabled, active/expired/paused placement, correct event scope, paid versus in-kind label, unknown contact channel and no invented sponsor in an empty state. Confirm archived event sponsorship can be historically labeled without appearing as currently active support.
- [ ] Run partner/card public specs and confirm new behavior fails.
- [ ] Implement the public section, sponsor contact action and scoped attribution. Make cache lifetime end no later than the next campaign boundary and actively invalidate affected pages/cards on pause/edit/retraction. Keep canonical competitive content independent. Historical acknowledgments must identify the past event/period rather than implying an ongoing paid campaign.
- [ ] Repeat tests, visually inspect cards/pages with zero/one/multiple sponsors, complete common checks and confirm real prices/deliverables/contact/compensation terms before activating a real agreement. No outreach or payment handling is implied by implementation.
- [ ] Commit: `feat: publish scoped partner and sponsor placements`.
