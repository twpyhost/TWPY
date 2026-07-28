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

**Why GitHub Actions instead of the home server:** the health check has a hard 7-day deadline. Tying it to home server uptime introduces risk (ISP outage, power cut, hardware issue) for something that's free and more reliable to run on GitHub's infrastructure instead.

**Requirement:** the check must run a real query against Supabase (not just hit the Vercel URL) — DB inactivity is what triggers the pause, not site traffic.

**`/api/health` route (Next.js)** — should perform a lightweight Supabase query (e.g. `select 1` or a trivial read) and return 200 on success.

**`.github/workflows/keep-supabase-alive.yml`:**
```yaml
name: Keep Supabase Alive
on:
  schedule:
    - cron: '0 12 * * *'   # daily at 12:00 UTC
  workflow_dispatch:         # allows manual trigger too

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Hit health check
        run: curl -f https://your-tekken-project.vercel.app/api/health
```

Daily frequency gives comfortable margin under the 7-day threshold. Free on GitHub Actions at this usage level.

---

## Tournament Management

**Decision: keep using Challonge, do not build a custom bracket system.**

Challonge already handles double/single elimination, seeding, match progression, and sharing. Rebuilding this would consume significant dev time without adding community value at 50 members.

### ⚠️ Two Challonge organizer accounts to account for
Tournaments predate this project and were originally created under **Challonge account A**. Going forward, the project uses **Challonge account B** as the default. The import process must support pulling from **both** accounts, not just one:

- **One-time backfill**: import historical tournaments from account A (API key/credentials for A needed once, not necessarily kept long-term unless more historical data surfaces later).
- **Ongoing sync**: import new tournaments from account B going forward (this is the "default" account referenced elsewhere in this doc).
- Each tournament record should store which source account it came from (`challonge_source_account: 'A' | 'B'`), mainly for traceability/debugging — not user-facing, but useful if an import needs to be re-run or audited.
- If there's any chance more tournaments get created under A by mistake going forward (e.g. an organizer forgets to switch accounts), the import script should check both accounts on each sync rather than assuming all new activity is on B.

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
