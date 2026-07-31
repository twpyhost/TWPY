# Challonge API Reference

Reference for the Challonge integration used to pull tournament data, clean it, and load it into Supabase. Written after reviewing the [Challonge v2.1 docs](https://challonge.apidog.io/) and verifying the real response shapes live against a real TWPY tournament (id `18177414`) — the docs proved incomplete on at least one critical field (see below), so treat the "verified live" notes here as more trustworthy than the Apidog docs themselves.

---

## Which API we use, and why

**v2.1** (`https://api.challonge.com/v2.1/...`), using the existing **legacy v1 API key** in header mode — not OAuth. Headers on every request:

```
Content-Type: application/vnd.api+json
Accept: application/json
Authorization-Type: v1
Authorization: <api key>
```

(Migrated from the plain v1 `?api_key=...` query-string auth this doc originally described — v2.1 requires the key in a header instead.)

Two organizer accounts, selected via a `cuenta` param (`'A' | 'B'`, default `'B'`):
- `CHALLONGE_API_KEY_A` — historical/backfill account, not actively synced.
- `CHALLONGE_API_KEY_B` (falls back to `CHALLONGE_API_KEY`) — current default for everything going forward.

**Rate limit constraint**: Challonge's free tier caps usage at **500 requests per 30 days** — confirmed for real (not just from docs) after a pagination bug during development exhausted the quota and returned `429` with `Retry-After: 2592000` (30 days) and body `"API request limit exceeded. Your plan allows 500 requests per 30 days."`. That's why:
- Results are always persisted to Supabase — public pages never call Challonge directly.
- Syncing a whole account costs close to **one** request (`listarTorneos`), not one per tournament.
- v2.1 has no `include_participants=1` equivalent, so `fetchChallongeApi` now costs 2+ requests per tournament (detail + at least one participants page) instead of v1's 1.

**Pagination gotcha (found live, not in the docs)**: Challonge's v2.1 API always returns a `links.next` URL, even past the last page — it is **not** a valid stop condition. The correct stop condition is: the page returned zero items, or `items collected so far >= meta.count` (when `meta.count` is present). `obtenerTodasLasPaginas` in `src/lib/challonge.js` implements this. Do not "fix" this back to checking `links.next` — that caused the quota exhaustion above.

## Endpoints currently used

Implemented in `src/lib/challonge.js`:

| Endpoint | Used by | Purpose |
|---|---|---|
| `GET /v2.1/tournaments/{id}.json` | `fetchChallongeApi` | Single tournament detail, for one-off import (`insertar_torneo`) and re-import (`reimportar`). |
| `GET /v2.1/tournaments/{id}/participants.json?per_page=100` (paginated) | `fetchChallongeApi` | Participants + `final_rank` for that tournament — fetched separately since v2.1 has no `include_participants` equivalent. |
| `GET /v2.1/tournaments.json?per_page=100` (paginated) | `listarTorneos` | Full tournament list for an account — used by the "Sincronizar" flow to detect new tournaments without fetching each one individually. |

### Response shape (JSON:API) and how it's normalized

v2.1 responses are JSON:API (`{ data: { id, type, attributes, relationships } }`), a different envelope than v1's flat JSON. To avoid touching `src/lib/importarTorneo.js` or the admin routes, `challonge.js` normalizes the v2.1 response back into the same flat shape those already consume (`{ tournament: { id, name, ..., participants: [{ participant: {...} } ] } }`), returned as a real `Response` object so `.ok`/`.status`/`.json()` all keep working unchanged.

**Tournament** (`data.attributes`): `name`, `game_name`, `state` (same granular values as v1 — verified live: `"complete"` for a finished tournament, so `state === "complete"` filters in `insertar_torneo/route.js:61` and `torneos/sincronizar/route.js:38` needed no changes), `full_challonge_url` (present as-is), `url` (slug only). Dates live under a **nested** `attributes.timestamps` object — `started_at`, `completed_at`, `created_at` — not top-level like v1 (top-level `attributes.starts_at` is the *scheduled* date, a different field).

**Participant** (`data.attributes` + `data.relationships`): `username`, `name`, `final_rank`, `seed`, `misc`, `states.active`. The numeric Challonge user ID — what `insertarResultados` matches against `player_challonge_accounts.challonge_id` to resolve identity, **never by name** — is at `relationships.user.data.id`, not a flat field. It's a **string** in the API response; both `torneos.id` and `player_challonge_accounts.challonge_id` are Postgres `bigint` columns and identity resolution matches via a JS `Map` keyed by number, so **this must be explicitly `Number(...)`-converted** or every match silently fails (string `"7097109"` !== number `7097109` as a Map key). When a participant has no linked Challonge account (manually added, never accepted an invite), the `user` relationship is simply absent — maps to `challonge_user_id: null`, the existing "no Challonge account" identity scenario.

Only tournaments with `tournament.state === "complete"` are imported.

## Endpoints relevant to future work (not yet consumed)

**Tournament states** — only `complete` is treated as importable today. Full list, in progression order:
`pending` → `checking_in` → `checked_in` → `accepting_predictions` → `group_stages_underway` → `group_stages_finalized` → `underway` → `awaiting_review` → `complete`.

**Matches** — `GET /tournaments/{id}/matches.json`, or via the tournament detail's `relationships.matches` (list of match IDs) + `included` compound resources. **Not consumed anywhere in the codebase today.** This is the gap to fill when Phase 2 ("match history", per `docs/infrastructure.md`) gets built. Verified live fields: `round` (negative values appear for losers-bracket rounds in double elimination), `identifier` (e.g. `"A"`), `suggested_play_order`, `scores` (e.g. `"2 - 0"`), `score_in_sets` (per-set breakdown), `winner_id`, `points_by_participant`, timestamps.

## Architecture for future import/loading functions

New Challonge import/loading code should be **Next.js API routes under `src/app/api/admin/`** — the same pattern as `insertar_torneo`, `torneos/sincronizar`, and `torneos/[id]/reimportar` already use (server-side Supabase client, same env vars, same deploy pipeline as the rest of the app).

Explicitly **not**:
- **Supabase Edge Functions** — no `supabase/functions` directory exists in this repo. Would add a second runtime (Deno), a second deploy/secrets flow, and a second free-tier budget (invocation count + per-invocation CPU-time cap) for no gain, since Challonge calls are network I/O bound and already fit comfortably inside a Vercel function.
- **The home Linux server** — kept fully out of this path. Everything Challonge-related should run cloud-side (Vercel), independent of home-server uptime.

If autonomous/scheduled sync (vs. today's admin-triggered "Sincronizar" button) is wanted later, reach for **Vercel Cron** — free on the Hobby tier at daily frequency, the same cadence already used for the GitHub Actions Supabase health check.
