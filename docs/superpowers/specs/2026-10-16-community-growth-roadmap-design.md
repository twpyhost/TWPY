# Community growth roadmap — design basis

Date: 2026-10-16 (America/Asuncion).
Status: planning draft. The seven priorities are the user's decisions; details marked **planning default** are proposed choices, not previously approved requirements. This document authorizes no deployment, purchase, sponsor outreach, or production data changes.

## Intent and delivery order

Make TWPY useful to players between tournaments, preserve the community's history, and eventually support paid partnerships that compensate the people maintaining it. Deliver these phases sequentially:

1. Public player profiles, including declared mains and an optional free EWGF.gg integration.
2. Upcoming event hub.
3. Ranking history.
4. Find my Liga matches.
5. Shareable results cards.
6. Community archive.
7. Partnerships and sponsorships, preceded by a hosting migration that permits commercial use at zero subscription cost.

Each phase must work on its own before the next starts. Prerequisite maintenance is not an eighth feature and must not turn into an unrelated cleanup project.

The feature order does not postpone a necessary hosting prerequisite: if Phase 2 will promote paid registration or any earlier phase introduces commercial content, bring forward Phase 7 Task 1 before publishing that content. Paid sponsor features still remain Phase 7. The existing `docs/infrastructure.md` already flags paid tournament entries as a reason to revisit Vercel Hobby.

## Current implementation

The repository has a competitor directory but no `/competidores/[id]` page. Public ranking and tournament results are present. `src/lib/data/{index,mockDb,supabaseDb}.js` is the public read facade; preserve both sources. The app currently uses JavaScript, Next.js 16 and React 19: use `.js` modules and existing components rather than introducing a TypeScript conversion or a UI framework.

`src/lib/rankings.js` already generates annual snapshots in `fecha_inicio, id` order. It is the authority for ranking calculations. Liga exposes groups, participants, scheduled dates and scored FT3 sets through `getLiga(slug)` and `armarLiga()`. Liga participant IDs and canonical player IDs are distinct.

Admin access has two roles: `admin` can operate all sections; `liga` can operate only Liga. New editorial and partnership pages require `requireSuperusuario()` and APIs require `requireAdmin()`. Existing local work and the pending Liga migration are recorded in `docs/estado-desarrollo.md`; preserve them.

## Global constraints

- Tekken 8 only. Keep Challonge as the bracket engine and support both organizer accounts A and B.
- Preserve `players` as the canonical person and the separate Challonge accounts/aliases. Never identify or merge people by name.
- Public pages require no login. Profile editing, event publishing, archives and sponsorship management are admin-only.
- Liga group results remain independent of annual ranking points and snapshots. PTS means FT sets won; sanctions are completed 0-0 sets with no winner or points.
- Preserve current ranking calculations and tie behavior. History reads stored snapshots; it does not invent a different ranking.
- Keep Supabase, its RLS protections, the daily real DB keep-alive and backups. Hosting migration must preserve their effectiveness.
- New public DTOs expose an explicit field allowlist, never raw administrative records. Do not add private metadata to a table already readable anonymously.
- API keys remain server-side or in scheduled-job secrets, never in `NEXT_PUBLIC_*`, browser responses or logs.
- No new mandatory paid service, auto-upgrade, payment processing subscription or purchased asset.
- UI copy stays Spanish and follows `design/README.md`. Read live DesignSync prototypes when producing layouts; this plan does not claim pixel approval.
- Use local Supabase and existing Playwright projects for automated tests, with one worker. Do not point tests at production.

## Shared implementation contracts

New public DTO IDs are decimal strings for bigint-backed records; existing facade return shapes remain compatible. Validate incoming route IDs before querying. Dates are ISO 8601 UTC instants where an instant is intended, displayed in `America/Asuncion`; retain Liga's existing date/time semantics.

All new read functions are exported through `src/lib/data/index.js` and `src/app/utils/db.js` remains its existing re-export. Each function has a mock implementation. Missing resource returns `null`; an empty collection returns `[]`; an upstream/database failure is an error, not a fabricated empty success.

New tables in exposed schemas enable RLS, grant only needed operations, index foreign keys and check ordering/uniqueness at the DB boundary. Use the repo's imperative migration workflow: discover CLI commands with `--help`, iterate only against local, run advisors, generate/review a migration using the local Supabase skill, and verify reconstruction without resetting the working development database. Do not fabricate migration timestamps in this roadmap.

## 1. Public player profiles

Public profiles show display name/avatar, declared main and secondaries, annual position/points, tournament entries and finishes, titles and podium count. No set win rate can be inferred from finishing positions. A player with no results remains a valid profile. Names in competitor, ranking, results and linked Liga rows navigate to the canonical profile.

**Planning default:** one declared main and any selected secondary characters, with no duplicate character or second main. Admins maintain these from information players supply. Character keys come from a curated Tekken 8 catalog using verified local assets; unknown/unselected stays explicitly unknown. This is profile metadata, not a new character analytics system.

Proposed additive records: `player_characters(player_id, character_key, is_main)`, `player_tekken_accounts(id, player_id, tekken_id, active)` and server-only `ewgf_player_cache(account_id, fetched_at, source_updated_at, schema_version, payload)`. A Tekken ID belongs to one canonical person; a person may have several platform accounts. Publicly expose only linked IDs the admin has explicitly marked public. Account linking requires admin confirmation and never nickname matching.

Extend the existing merge operation so linked Tekken accounts follow the surviving player; keep the base player's main and add nonduplicate characters as secondaries. Show that outcome in the existing merge confirmation and audit it. Reject ambiguous/conflicting account ownership rather than silently overwriting it. Old profile IDs redirect to the survivor, with a bounded cycle-safe resolver; invalid/unknown IDs return 404. Public redirects must not make the identity queue readable.

EWGF is optional enrichment, not a dependency of the profile. As checked on 2026-10-16, its Free plan provides 100 requests/hour and up to 50 recent battles with a 24-hour delay; profile metadata/current-main endpoints require Pro. Use only the documented free battles endpoint. [EWGF API documentation](https://ewgf.gg/api-docs).

**Planning default:** one scheduled refresh per day per linked active account, at most 80 requests per UTC hour for the whole integration, with retries included. For 50 IDs a full pass uses 50 requests. Use durable quota state and one running job, respect upstream remaining/reset and Retry-After, and checkpoint across hours if the roster grows. Page views never call EWGF. Keep at most one normalized 50-battle cache per account; display retrieval time and delayed-source labeling. Preserve last good cache on failure. Never relabel a current character from a small battle sample as the declared main.

A real authenticated response from a user-supplied free key must be validated before enabling enrichment. Until then, ship the local profile and mains; do not promise rank, prowess, full-history win rate, pentagon, Elo or any other unverified battle field. Tests use sanitized fixtures, never the real service. Missing/revoked keys and newly paid endpoints disable enrichment without breaking profiles or triggering an upgrade.

## 2. Upcoming event hub

Introduce public `/eventos` and `/eventos/[slug]`, a next-event summary on home, and admin `/admin/eventos`. Store planned events separately from imported tournament results. A completed event can link to a tournament by explicit ID; creating an event never imports it or adds ranking points.

**Planning defaults:** title/slug, plain-text description, venue/address/map link, online/offline mode, start/end, registration deadline/link, fee in integer PYG (0 = free, null = to confirm), optional stream link, publication status and event status. Scheduled/completed events need a start; postponed dates may be unknown. End must not precede start. Cancellation remains visible on an already-published URL. Only published content appears publicly.

Add a calendar subscription/download endpoint with stable event UID and revision sequence, timezone-correct times and cancelled-event updates. Keep cancelled entries in the feed for 90 days so clients can retract them. A previously dated event postponed without a replacement date retracts that dated calendar entry with the same UID and a higher sequence; the website still labels it postponed. Safe HTTPS links only. No on-site registration or payment collection.

## 3. Ranking history

Select the annual standings after a particular imported tournament; retain the existing season-only URL behavior. Add a chronological position/points series to player profiles, with an accessible table alongside the chart. Order cuts by `fecha_inicio` then tournament ID, matching snapshot generation. Compare movement against the preceding cut in the same season.

Read snapshots and existing public player metadata only. No schema or recalculation algorithm change is required. A missing snapshot is unavailable data, never a made-up zero or position. Identity corrections/reimports may legitimately recalculate historical cuts; this is reconstructed competitive history, not a separate immutable audit ledger. League group scores and EWGF data cannot enter this history.

## 4. Find my Liga matches

Add a player selector to `/liga`, showing the selected participant's group, standings context, completed/pending/sanctioned sets, opponents and scheduled dates. Selecting an unlinked participant must work; profile navigation is available only when a canonical `playerId` exists.

**Planning default:** identify the selection by `(ligaSlug, participanteId)`, share it in `?participante=...`, and remember it locally under a league-specific storage key. URL selection wins over stored preference; a stale URL shows a clear invalid-selection state, and stale storage is cleared. No authentication, name matching, server storage or new points calculation. Reuse the already-fetched league bundle and shared scoring helpers.

## 5. Shareable results cards

Generate tournament podium and player-season summary PNGs in 1200×630 and 1080×1350 formats. Reuse the same public projections as the pages, with provenance/season labels and no EWGF data in the first version. Ties retain their actual placement; fewer than three competitors must not create a fictitious podium.

Use the existing Next.js stack and `ImageResponse` from `next/og`; it generates images from JSX. [Next.js ImageResponse](https://nextjs.org/docs/app/api-reference/functions/image-response). A visual implementation check must verify local fonts, long names and rendering support on the target host. Use bundled, verified assets rather than fetching arbitrary remote avatar URLs during generation. Add download and copy-link; native sharing is progressive enhancement initiated by the user. No automatic social posting.

Bound formats and IDs, reject arbitrary text/image URL parameters, cache outputs and invalidate/version them when public source data changes. Preserve the same route URLs across the hosting move. Phase 7 may add currently active, context-matching sponsor attribution.

## 6. Community archive

Public `/archivo` and `/archivo/[slug]` hold curated recaps with event/tournament links, season, date, captions/credits, photos and external video/VOD links. Add admin `/admin/archivo` with draft/published states. No general-purpose news CMS, comments, public uploads or video hosting.

**Planning defaults:** plain-text recaps; JPEG/PNG/WebP photos only, at most 2 MiB per photo and an initial 100 MiB application media budget. Store owned photos in a private Supabase bucket; public reads are allowed only through published archive entries and short-lived signed URLs. Draft records and draft media are unavailable anonymously. Validate file content as well as extension/MIME, reject SVG/HTML, use generated object paths and avoid arbitrary video HTML. Embed only allowlisted providers; otherwise show an ordinary safe link.

The archive owns its content independently: removing a tournament sets its archive reference null rather than cascading away a recap. Publication/retraction changes invalidate relevant caches and sitemap entries. Preserve captions/credits and stable URLs. Extend backups to cover media bytes, a matching metadata/DB snapshot and a checksum manifest; DB pg_dump alone does not back up Storage objects. The initial media-backup retention is 14 days, subject to measured account artifact/storage limits; verify a restore before accepting irreplaceable uploads. Existing public-schema DB backups retain their established policy, but full media restores are guaranteed only within the separate media retention window.

## 7. Partnerships and sponsorships

First complete the commercial-hosting check/move; then enable paid placements. Public `/patrocinadores` explains the offer, displays active partners and gives an admin-configured contact link. Admin `/admin/patrocinadores` manages logos, destinations, start/end, publication and placement scope (site, event, season).

**Planning default:** direct, manually negotiated sponsorships, not programmatic ads or a checkout. Model public partners separately from private agreement/contact/fee notes. Paid placements say `Patrocinado`; in-kind partners say `Colaborador`. Half-open campaign intervals `[starts_at, ends_at)` and UTC timestamps determine activity. Pausing/retracting an agreement removes its public placements and cached cards. Use a public contact channel chosen by the admins, not a personal number published by assumption.

Commercial package prices, deliverables and the admin/community revenue split require a business decision before selling; do not invent prices, reach, sales, automated payouts or guaranteed income. Scope the first offer to website exposure, with event/social/stream recognition included only when explicitly agreed and deliverable. Sponsor status never alters scores, ranking order or player discoverability.

**Hosting finding:** Netlify explicitly permits commercial projects on its standard Free plan. Its Open Source program is a different offer and is not the proposed route. [Commercial-use confirmation](https://www.netlify.com/guides/netlify-vs-vercel/). Netlify documents support for Next.js App Router, SSR, ISR, route handlers, images and middleware through its OpenNext adapter; compatibility with this repository must still be proved by a nonproduction deployment. [Framework documentation](https://docs.netlify.com/build/frameworks/framework-setup-guides/nextjs/overview/).

The standard Free plan currently has a zero subscription fee, 300 shared monthly credits, a hard cap and no automatic recharge. Collaboration/private-repository restrictions must be checked against the actual owner/deployment workflow, without publishing a private repository to qualify. [Plan limits](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/). At exhaustion, sites pause; free is not an uptime guarantee. The migration includes measured usage and a host-independent daily DB keep-alive. [Credit accounting](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/).

## Planning boundaries

No feature code, schema migration, external account setup or deployment is part of creating this plan. Execution starts with Phase 1 after reviewing its planning defaults. Confirm EWGF credentials/fields when enabling that optional integration, event/partner contact channels before publishing them, sponsor business terms before sales, and free-host viability before commercial cutover. Those inputs do not prevent planning or local implementation of the independent parts.
