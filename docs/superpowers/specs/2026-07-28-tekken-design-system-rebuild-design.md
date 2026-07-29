# Tekken 8 Design System Rebuild — Design Spec

Date: 2026-07-28

## Overview

Rebuild TWPY's public site and admin dashboard onto the "Tekken 8" design
system produced in Claude Design (project `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`,
mirrored locally under [`design/`](../../../design)). This is a full visual
and structural replace of the current ad-hoc Tailwind styling (Warsaw Gothic
font, `tekken-pink` one-off color, gradient body background, generic
`<Table>` grid) — not a parallel theme. Existing Next.js routes, data layer
(`src/lib/data`), and auth flow are kept; only presentation (and, for Login,
the addition of a working Discord OAuth button) changes.

Implementation order: **design-system foundation → Home → Ranking →
Competidores → Reglamento → Login → Admin Dashboard**. Admin is large enough
(6 sections, drill-downs, merge tooling) that it should get its own detailed
plan pass once the earlier pages establish the shared component patterns —
this spec covers it at the same depth as the design handoff doc, not deeper.

## Non-goals

- Grupos, Fixture, and Flier Principal (the social/print graphic generators)
  are **out of scope**. Their design files may be referenced for shared
  chrome (header/footer/background treatment) but are not implemented now.
- No change to the Supabase schema, auth model, or `DATA_SOURCE` toggle
  described in `CLAUDE.md` / project memory.
- No pixel-perfect paid-font swap (Bebas Neue Pro / Source Sans Pro via
  Typekit) — the design system's Google Fonts substitutes (Bebas Neue,
  Source Sans 3) are final for this pass.

## CLAUDE.md update

Add a short pointer section to `CLAUDE.md` noting that `design/` holds the
Claude Design handoff (source of truth for visual spec, read `design/README.md`
first) and `docs/` holds admin/infra briefs and specs — so future sessions
know to check there before re-deriving UI decisions from scratch.

## Design tokens → Tailwind

Values pulled directly from the design project's token files (not just the
README's prose):

**Colors** (`tailwind.config.mjs` → `theme.extend.colors`), as RGB triplets
usable with Tailwind's `rgb(var(--x) / <alpha-value>)` pattern:
- `primary` 50-900, anchored at 500 `245 10 100` (`#F50A64`)
- `tekken-blue` 50-900, anchored at 500 `63 209 231` / 400 `92 216 235`
- `dark-gray-3` 50-900 (panel/card surface), 500 `11 15 23`
- `success` `94 192 105`, `warning` `245 244 79`, `error` `230 0 0`

Register each scale as CSS custom properties in `globals.css` (`--color-primary-500: 245 10 100;` etc., copied verbatim from the design's `tokens/colors.css`) and reference them from `tailwind.config.mjs` via `rgb(var(--color-primary-500) / <alpha-value>)` so both raw `rgb(var(...))` usage (copied from design markup) and Tailwind utility classes (`bg-primary-500`, `text-tekken-blue-400`) work off the same source.

**Spacing/breakpoints**: `--bp-tablet:723px; --bp-laptop:1080px; --bp-desktop:1440px` etc. from `tokens/spacing.css` — only pull into `tailwind.config.mjs.screens` if a page actually needs a non-default breakpoint; most layout in the design uses `clamp()` fluid values written inline, which port as arbitrary-value Tailwind classes (`p-[clamp(24px,5vw,72px)]`) or plain inline styles where clamp is load-bearing.

**Effects** (`globals.css` custom properties + utility classes, not Tailwind theme — clip-path shapes aren't a first-class Tailwind token):
```css
--clip-banner-both: polygon(10% 0%, 100% 0, 90% 100%, 0% 100%);
--clip-banner-right: polygon(0% 0%, 100% 0, 82% 100%, 0% 100%);
--clip-banner-left: polygon(0% 0%, 100% 0, 100% 100%, 18% 100%);
--ease-standard: cubic-bezier(.4,0,.2,1);
--shadow-glow-primary: 0 2px 20px rgba(245,10,100,.5), 0 6px 15px rgba(245,10,100,.25);
```
plus a `.ribbon` utility class implementing the common eyebrow/badge clip-path + padding pattern seen throughout the designs (`clip-path:polygon(6-8% 0,100% 0,92-94% 100%,0 100%)`).

**Fonts**: replace `localFont` Warsaw Gothic with `next/font/google` loading Bebas Neue (display) and Source Sans 3 (body, weights 400/600/700 + italics), matching `tokens/fonts.css`. Expose as `--font-display` / `--font-body` CSS vars consumed by Tailwind's `fontFamily.display` / `fontFamily.body`. Remove `font-warsaw` usage from `layout.js` and drop the gradient body background (`from-[#630D33] to-[#277687]`) in favor of `bg-black`.

## Shared primitives (`src/components/`)

- **`Navbar`** (rebuild in place): sticky 76px black bar, TEKKEN 8 logo left (links to `/`), 5 italic Bebas Neue links (Ranking/Torneos/Competidores/Reglamento/Login) with active-route underline+glow (magenta, cyan for Login), hamburger + slide-down panel under 880px. Keep existing session-aware admin dropdown, restyle to match.
- **`Footer`** (single shared component, used on every page except Login): the design's Home "Sobre nosotros" content — TWPY logo, heading, body paragraph, social icon row, credits row — restyled with new tokens, keeping the copy already present in the current global `Footer.js`. **Decision (overrides the design handoff's per-page lean-footer variant)**: one `Navbar` + one `Footer`, identical on every page — Home, Ranking, Competidores, Reglamento, Admin's public-facing bits. No separate lean wordmark-bar footer.
- **`RibbonTag`**: small reusable component for the clip-path eyebrow/badge pattern (props: text, color variant).
- **`Button`**: primary (magenta, glow shadow, brightness-dim hover + black border-on-hover) and secondary/outline variants.
- **`HeroSection`**: radial-gradient dark background + two blurred glow blobs (magenta/cyan), used by Ranking/Competidores/Reglamento hero blocks.

**Login is the one exception**: it keeps the distinct top bar + "← VOLVER AL INICIO" back link already designed into `design/Login Liga Tekken Paraguay.dc.html` — no shared `Navbar`, no shared `Footer`. `layout.js` renders `Navbar`/`Footer` for every route; a small pathname check (same `usePathname()` pattern already used inside `Navbar`) skips rendering both on `/auth/login`.

`Table.js` is retired from the pages this plan rebuilds (Ranking, Competidores get bespoke card/row markup per the design — no generic grid component fits both) but is still used by `src/app/torneo-resultado/[slug]/page.js`, which is out of this plan's scope — a follow-up plan will rebuild that page once its design is ready.

## Per-page plan

### Home (`src/app/page.js`)
Navbar (shared) → **existing hero kept as-is** (Jin/Kazuya images, "Bienvenido al Ranking..." heading, `SeeRankingButton`, mobile/desktop split) — no visual changes to this section per explicit user decision — → Footer (shared). Source reference: `design/Home Liga Tekken Paraguay.dc.html` for the footer block only.

### Ranking (`src/app/ranking/page.js`)
No dedicated "Ranking" web screen exists in the design bundle (only the fixed-size social-graphic Landscape/Portada exports, out of scope). Build hero (`HeroSection`, eyebrow "RANKING", stat callout) + list using the **same card/row visual language as Competidores** (numbered rows, magenta/cyan tier accents, Bebas Neue point figures) — this is explicit in `design/README.md`'s Ranking section. Keep existing `getRankings()` data (posicion/challonge_username/puntaje/movimiento) and the ▲/▼/=/★ trend indicator, restyled to match the design's trend-coloring convention. `Footer` (shared).

### Competidores (`src/app/competidores/page.js`)
Hero with two stat counters (total / ranked) → optional top-3 podium (`showPodium`, default true) → filter pills (Todos/Rankeados/Sin puntos) + search + sort (points/A-Z) → responsive card grid (`auto-fill minmax(232px,1fr)`), top-3 cyan accent, ranked magenta, unranked dim. Wired to existing `getCompetidores()`. Source: `design/Competidores Liga Tekken Paraguay.dc.html`. `Footer` (shared).

### Reglamento (`src/app/reglamento/page.js`)
Hero (eyebrow "NORMATIVA OFICIAL · TEKKEN 8", H1, rule-count stat) → 4 quick-fact cards → sticky left index (6 anchored sections) + numbered rule list (11 rules, ported from `design/Reglamento Liga Tekken Paraguay.dc.html`, content matches current hardcoded rules almost verbatim) → cyan accent for section 4 ("En la partida") → rule 05 gets the white "DESCALIFICACIÓN" ribbon. `Footer` (shared).

### Login (`src/app/auth/login/page.js`)
Distinct layout, no shared Navbar — simple top bar (logo + "← VOLVER AL INICIO" link back to `/`) over full-page radial gradient with pulse animation. Two-column (form-first stacked <780px): left eyebrow+H1("ENTRÁ A LA ARENA")+stat callouts, right bordered form card (email/password, "Recordarme" + forgot-password row, magenta submit "INGRESAR", divider, Discord OAuth button, register link). Keep existing `/api/auth/login` POST flow for the email/password path. **New**: wire the Discord button to a real Supabase OAuth (`signInWithOAuth({ provider: 'discord' })`) call instead of leaving it as a no-op — the design's copy implies it should work. Source: `design/Login Liga Tekken Paraguay.dc.html`.

### Admin Dashboard (`src/app/admin/**`)
Rebuild as the design's app-shell: fixed 250px sidebar (logo, nav with icon+label+badge counts, user chip) collapsing to an off-canvas drawer <900px, sticky header with health pill, 6 sections (Identidades, Jugadores, Torneos, Rankings, Contenido, Sistema). All mock data in the design must be replaced with real reads/writes against the schema in `CLAUDE.md` (`players`, `player_challonge_accounts`, `player_aliases`, `tournament_participants_raw`, ranking snapshots) via `src/lib/data` / admin API routes with `SUPABASE_SERVICE_ROLE_KEY`. Given size, treat each of the 6 sections as its own implementation slice once we reach this phase; write a follow-up spec/plan for Admin specifically before starting it, reusing the shared primitives (`Button`, `RibbonTag`, modal, toast) built for the public pages.

## Assets

Character portraits, sponsor logos, and flier/fixture-only images are **not** needed for this pass. Required assets already exist locally:
- `public/images/tekken8-logo-sm.png`, `public/images/misc/tekken8-logo-sm.png` (nav logo)
- `public/images/LOGO TWPY/PNG/...` (TWPY logo — confirm exact variant matches `TWPY LOGO VARIANTES-04.png` used in the design; re-export from the design project's `uploads/` via the Design MCP if the local PNG variant differs)

## Open items / follow-ups

- Admin Dashboard gets its own spec pass before implementation (noted above).
- Real Typekit font licensing swap (Bebas Neue Pro / Source Sans Pro) — backlog, not this pass.
- Confirm exact TWPY logo PNG variant against the design's `uploads/TWPY LOGO VARIANTES-04.png` when implementing Home/Login/Reglamento (byte-for-byte match not required, visual match is).
