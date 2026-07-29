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

- `design/README.md` — analysis/spec of the Tekken 8 visual system (source of truth for UI): per-screen layout breakdowns, design tokens, fidelity notes, and discrepancies (mocked data, default-value mismatches) found while reviewing the source designs. The raw `.dc.html` prototype files themselves are **not** mirrored in this repo — read them live from the Claude Design project via the `DesignSync` tool (`get_file`/`list_files`, project ID `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`) rather than expecting local copies. Historical specs/plans under `docs/superpowers/` may still reference `design/*.dc.html` paths from before this change — those are point-in-time records, not live pointers.
- `docs/superpowers/specs/` — feature design specs (brainstorming output) written before implementation plans.
- `docs/superpowers/plans/` — implementation plans, one per spec.
- `docs/admin-dashboard-brief.md`, `docs/infrastructure.md` — standalone briefs referenced elsewhere in this file.

---

## Core domain model & business rules

### Player identity (important — read before touching player/tournament tables)

**Status: this is the TARGET model, not yet implemented.** The current schema (`supabase/migrations/0001_init.sql` onward) has a simpler, flat design: `usuarios` (conflates player + Challonge account in one row, one `challonge_id` per row, `es_temporal` bool flags manual/no-account users) and `nombres_alternativos` (alias per `usuario_id`, not per `challonge_id`). There is no `players`/`player_challonge_accounts`/`player_aliases`/`tournament_participants_raw` split in the DB or in `src/lib/data/supabaseDb.js` or `mockDb.js` today — see the 5 scenarios below for exactly what does and doesn't work under the current schema. The target model described in this section is what a future migration should move toward; do not assume it already exists when reading code.

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

#### The 5 identity scenarios this model must support

Design/implementation target — checked against actual code on 2026-07-29 (see "Status" note above):

1. **Player with only one Challonge account (ideal case).** ✅ Works today too — `usuarios.challonge_id` unique, matched on import (`supabaseDb.js:296-352`).
2. **Player with multiple Challonge accounts over time.** ❌ Not supported today — one `challonge_id` column per `usuarios` row means a second account creates a fragmented duplicate player. This is exactly what `player_challonge_accounts` (plural, FK to one `player_id`) is for.
3. **Player forgot their old account, admin registers manually — later needs reconciling with the old account.** ⚠️ Partially possible today (`es_temporal = true` record can exist) but there's no persisted "unlinked queue" — only an in-memory warning string during import, nothing queryable for later admin review. Target model's `tournament_participants_raw` + admin linking flow covers this.
4. **Player has no Challonge account at all, admin-registered.** ⚠️ Schema allows it (`es_temporal`, `challonge_id = null`) but there's no standalone "register player manually" admin route/form — only reachable indirectly via tournament-import auto-creation today.
5. **Player wants to link a manually-registered record into a new/recovered Challonge account.** ❌ Zero support today — no merge table, no reassignment path for `resultados`/`ranking_snapshots`, no route/UI. This is the admin-only "reassign `challonge_id` to a different `player_id`" merge action described above.

Known extra risk in current import code (not one of the 5, but related): unknown participants are auto-matched by **lowercase display name** (`supabaseDb.js:212-214`) with no review step — two different real people sharing a name could be silently merged into one `usuarios` row. Any redesign should replace this with the `tournament_participants_raw` staging + review flow rather than eager auto-matching.

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
