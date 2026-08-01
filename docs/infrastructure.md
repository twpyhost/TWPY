# Tekken Paraguay Community Platform — Infrastructure Overview

## Project Context

Community hub for **Tekken Paraguay** (~50 active members). Purpose: player profiles, tournament history, rankings/stats, news, media, and a long-term archive of the Paraguayan Tekken scene.

**MVP scope: Tekken 8 only.** The platform was originally scoped to support multiple games, but for the MVP the focus is exclusively Tekken 8 — no per-game filtering, no multi-game data model. Multi-game support moves to Phase 4 (only if the community grows and expands to other titles).

Priorities: low maintenance, minimal cost, reliability, room to grow, fast development. No enterprise infra needed.

---

## Architecture

```
Users
  │
  ▼
Cloudflare (DNS + CDN + Security)
  │
  ▼
Vercel (Frontend Hosting — Next.js, free tier)
  │
  ▼
Supabase (Database + Auth + Storage, free tier)
  │
  ▼
Home Linux Server (background automation only — not in critical path)

GitHub Actions (scheduled health check → keeps Supabase project active)
```

---

## Frontend

- **Stack**: Next.js, React, TypeScript, Tailwind CSS
- **Hosting**: Vercel Free (Hobby) tier
- **Why**: zero-config deploys from GitHub, free CDN/SSL, no server to maintain, no sleep/pause behavior (serverless architecture, not an idling container)
- **Caveat**: Hobby tier ToS is intended for non-commercial use. Fine as-is with no sponsors/paid entries. Revisit (Pro plan, ~$20/mo) if the project ever adds sponsorships or paid tournament entries.

---

## Backend

- **Stack**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth — Discord login (best fit for a gaming community), optionally Google/email
- **Storage**: Supabase Storage — avatars, tournament banners, photos, media
- **Realtime** (future, optional): live tournament updates, notifications

### Data model (high level)
```
Players
  ├── Matches
  ├── Tournament Results
  ├── Characters
  ├── Rankings
  └── Achievements
```

### ⚠️ Known limitation: free-tier project pause
Supabase pauses free projects after **7 days of database inactivity**. This is solved below — do not skip this part, it's required at this architecture, not optional.

---

## Keeping Supabase Awake — GitHub Actions Health Check

**Status: implemented** (`src/app/api/health/route.js`, `.github/workflows/keep-supabase-alive.yml`, migration `0008_sistema_eventos.sql`).

**Why GitHub Actions instead of the home server:** the health check has a hard 7-day deadline. Tying it to home server uptime introduces risk (ISP outage, power cut, hardware issue) for something that's free and more reliable to run on GitHub's infrastructure instead.

**How it works**: `/api/health` runs a real, lightweight Supabase query (`select id from juegos limit 1`) with the anon client — DB inactivity is what triggers the pause, not site traffic, so hitting the Vercel URL alone wouldn't be enough. The route logs a row to `sistema_eventos` (consumed by the admin Sistema panel) only when the request carries the correct `x-health-secret` header, so an anonymous GET can't spam rows. The workflow runs daily at 12:00 UTC + `workflow_dispatch`, using `vars.SITE_URL` and `secrets.HEALTH_PING_SECRET` — nothing hardcoded.

**Still pending**: `vars.SITE_URL` needs the real production domain once the Vercel deploy (see the go-live plan's Hito 7) is live, and the workflow needs one `workflow_dispatch` run to confirm end-to-end.

Daily frequency gives comfortable margin under the 7-day threshold. Free on GitHub Actions at this usage level.

---

## Backups — GitHub Actions + pg_dump

**Why this is required, not optional:** Supabase's free tier has no restorable backups (that's a Pro/PITR feature). Once the historical backfill runs (see the go-live plan), this database becomes the irreplaceable archive of the Paraguayan Tekken scene — a lost project is not recoverable without this.

**`.github/workflows/backup-supabase.yml`**: weekly (`0 6 * * 0`, Sunday 06:00 UTC) + `workflow_dispatch`. Runs `pg_dump` against `secrets.SUPABASE_DB_URL`, scoped to `--schema=public` only, gzipped and uploaded as a workflow artifact (90-day retention, the max without extra org/repo configuration).

**Why `--schema=public` only**: Supabase's internal schemas (`auth`, `storage`, `extensions`, `realtime`, etc.) are owned by platform-managed roles. Tested locally: a full-database dump restored onto a fresh Supabase instance throws dozens of `must be owner of table ...` and event-trigger errors — those schemas aren't meant to be restored this way, and a fresh Supabase project already provisions them correctly. Everything that matters for the community archive (`players`, `torneos`, `tournament_participants_raw`, `ranking_snapshots`, etc.) lives in `public`, so scoping the dump there is both correct and avoids all of that noise.

**Restore procedure** (tested against the local stack on 2026-07-30 — a backup nobody has restored isn't a backup):
1. Download the artifact from the workflow run and `gunzip` it.
2. Target project: either a brand-new Supabase project with migrations already applied (`supabase db push`), or the local stack (`supabase start`).
3. Restore: `psql "<connection-string>" < backup-YYYY-MM-DD.sql` (the dump uses `--clean --if-exists`, so it drops/recreates objects cleanly even against an already-migrated schema).
4. Verify row counts on a couple of key tables (`players`, `torneos`) match expectations.

Run the backup workflow manually once, right after the historical backfill completes, so day one already has a real snapshot.

---

## Tournament Management

**Decision: keep using Challonge, do not build a custom bracket system.**

Challonge already handles double/single elimination, seeding, match progression, and sharing. Rebuilding this would consume significant dev time without adding community value at 50 members.

### Two Challonge organizer accounts to account for

**Status: implemented** (`src/lib/challonge.js` — `apiKeyPara`/`fetchChallongeApi`/`listarTorneos` all take a `cuenta` param; migration `0009_torneos_source_account.sql` adds `torneos.challonge_source_account`). `insertar_torneo` accepts `cuenta` in the request body (`'A' | 'B'`); when omitted it tries A first and falls back to B. The admin UI lives in the Torneos section (`src/app/admin/torneos/`): "Sincronizar nuevos torneos" (one click, always account A) and "Agregar torneo" (single URL/ID, auto-detects A/B), with per-tournament source-account badges and a filter.

Tournaments going forward are created under **Challonge account A (TWPY_Host)**. Tournaments that predate this project live under **Challonge account B (Wario)**. The import process must support pulling from **both** accounts, not just one:

- **One-time backfill**: import historical tournaments from account B (API key/credentials for B needed once, not necessarily kept long-term unless more historical data surfaces later). Already done — see the go-live plan's Hito 8.
- **Ongoing sync**: import new tournaments from account A going forward (this is the "default" account referenced elsewhere in this doc).
- Each tournament record stores which source account it came from (`challonge_source_account: 'A' | 'B'`), mainly for traceability/debugging — not user-facing, but useful if an import needs to be re-run or audited.
- If there's any chance more tournaments get created under B by mistake going forward (e.g. an organizer forgets to switch accounts), a manual re-check of account B would be needed — sync only checks A.

### Integration pattern
```
Website → Tournament Page → Info (date, location, participants, results) → Embedded/linked Challonge bracket
```

### Sync flow
```
Tournament created (Challonge account A [historical] or B [current/default])
        │
Challonge manages matches
        │
Tournament finishes
        │
Home server imports results (checks both accounts)
        │
Supabase updates: player stats, rankings, match history, Hall of Fame
```

*(Character-specific stats deferred — not needed for Tekken 8-only MVP; revisit if useful later.)*

---

## Home Linux Server — Role

**Not used for**: website, database, or main backend (avoids home-connection single point of failure for anything time-critical).

**Used for** (non-critical-path automation, tolerant of delay):
- Discord bot (announce results, event notifications, ranking updates)
- Batch processing: importing Challonge results, calculating rankings/stats, generating backups

Note: keep the Supabase health-check ping on GitHub Actions, separate from home-server batch cron jobs — different reliability requirements (hard 7-day deadline vs. hours of tolerable delay).

---

## Development Phases

**Phase 1 — Core site**: home, events, news, player profiles, tournament archive, community info

**Phase 2 — Competitive features**: rankings, match history, tournament stats, character stats, achievements

**Phase 3 — Automation**: Challonge sync, Discord integration, automatic rankings, notifications

**Phase 4 — Only if community grows significantly**: custom tournament system, league system, **multi-game support (originally in MVP scope, deferred)**, sponsorship management

---

## Cost Summary

| Service | Cost |
|---|---:|
| Vercel | $0 |
| Supabase | $0 |
| Cloudflare | $0 |
| GitHub Actions | $0 (at this usage) |
| Domain | ~$10-15/year |
| Linux Server | Already owned |

**Total: ~$10-15/year**

---

## Guiding Principle

Don't rebuild existing infrastructure — build the layer that creates community value.

Challonge handles tournaments. Supabase handles data. Vercel handles the website. GitHub Actions keeps the backend alive. The home server automates non-critical processes.
