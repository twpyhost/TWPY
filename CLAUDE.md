# Tekken Paraguay Community Platform — Project Overview

## What this is

Community hub for **Tekken Paraguay** (~50 active members): player profiles, tournament history, rankings, news, media, and a long-term archive of the Paraguayan Tekken scene.

**MVP scope: Tekken 8 only.** No multi-game support yet — deferred to a later phase.

---

## Tech Stack

- **Frontend**: Next.js, React, TypeScript, Tailwind CSS
- **Hosting**: Vercel (Free/Hobby tier)
- **Database/Auth/Storage**: Supabase (PostgreSQL, free tier)
- **Tournament engine**: Challonge (external, not custom-built)
- **Automation**: existing home Linux server (batch jobs only, not in critical path)
- **Keep-alive**: GitHub Actions scheduled workflow (Supabase free tier pauses after 7 days of DB inactivity — do not remove this without replacing the mitigation)

---

## Architecture

```
Users → Cloudflare (DNS/CDN) → Vercel (Next.js frontend) → Supabase (DB/Auth/Storage)
                                                                  ↑
                                                    Home Linux Server (batch import/automation)
                                                                  ↑
                                              GitHub Actions (daily health check, keeps Supabase awake)
```

---

## Design & specs

- `design/` — Claude Design handoff for the Tekken 8 visual system (source of truth for UI). Read `design/README.md` first; the `.dc.html` files are interactive design references, not code to copy verbatim (see that README for why). The live Claude Design project is `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`.
- `docs/superpowers/specs/` — feature design specs (brainstorming output) written before implementation plans.
- `docs/superpowers/plans/` — implementation plans, one per spec.
- `docs/admin-dashboard-brief.md`, `docs/infrastructure.md` — standalone briefs referenced elsewhere in this file.

---

## Core domain model & business rules

### Player identity (important — read before touching player/tournament tables)

A `players` record is the **canonical person**. It is deliberately decoupled from Challonge accounts because:

- The same person can have **multiple Challonge accounts** over time (forgot old account, created a new one).
- Some participants have **no Challonge account at all** — registered manually by an admin on request.

```
players
  ├── id (canonical)
  ├── display_name, avatar, discord_id, etc.

player_challonge_accounts
  ├── player_id (FK → players)
  ├── challonge_id
  ├── challonge_username
  └── active (bool)

player_aliases            -- name changes WITHIN the same Challonge account
  ├── challonge_id + name (composite PK)
  └── active

tournament_participants_raw
  ├── challonge_tournament_id
  ├── challonge_id (nullable — null if manually registered without an account)
  ├── temp_name (used until a challonge_id is known)
  └── player_id (resolved either via challonge_id or manual admin linking)
```

**Do not merge `players` and `player_challonge_accounts` into one table.** The whole point of the split is to support account merges without losing history — an admin-only action that reassigns a `challonge_id` to a different `player_id`.

### Two Challonge organizer accounts

- **Account A**: historical, used before this project existed. One-time backfill source, not actively synced.
- **Account B**: current default, used for all tournaments going forward.
- Every imported tournament stores `challonge_source_account: 'A' | 'B'` for traceability.
- Import logic must be able to pull from either account — don't hardcode a single organizer account/API key.

### Rankings

- Points per finishing position are **parametrizable** (single table: position → points, since MVP is Tekken 8 only — no per-game table needed yet).
- Annual sum of points per player, with a **snapshot/cut after each tournament** to preserve historical standing over the year (not just a running total with no history).
- Each tournament result shows a trend arrow (▲/▼) reflecting change in global ranking position.

### Auto-registration on import

When a tournament is imported and a Challonge participant isn't in `player_challonge_accounts`/`player_aliases` yet:
- System auto-creates the player + account + alias (marked active) — this becomes part of the "unlinked participants" queue for manual review, it isn't silently trusted as correct.
- If a participant has no Challonge account (manually registered by admin), their `temp_name` persists across future tournaments until an admin links a real Challonge account, at which point historical results get updated to the real identity.

---

## Admin dashboard (separate app section, `/admin`, auth-gated)

Sections: **Resolución de identidades** (highest priority — unlinked participants queue, account merging, manual player registration), **Jugadores**, **Torneos** (sync new / import historical with account selector A|B + preview, source-account badges), **Rankings** (recalculate action), **Contenido** (news/events CRUD), **Sistema** (health check status, Discord bot status, last import status).

Full UI brief lives in `docs/admin-dashboard-brief.md` (or wherever you save the Claude Design brief — see placement note below).

---

## User-facing side

No authenticated user dashboard in MVP. Player profiles, rankings, tournament results, and news are all **public pages**, no login required. Auth (Discord OAuth) is only needed for the admin panel for now.

---

## Explicit non-goals for MVP

- No custom tournament bracket system — Challonge handles this.
- No multi-game support — Tekken 8 only.
- No character-specific stats — deferred.
- No authenticated user dashboard — deferred until the community asks for self-service profile editing.

---

## Development phases

1. Core site: home, events, news, player profiles, tournament archive
2. Competitive features: rankings, match history, tournament stats, achievements
3. Automation: Challonge sync, Discord integration, automatic rankings, notifications
4. Only if community grows: custom tournament system, league system, multi-game support, sponsorships
