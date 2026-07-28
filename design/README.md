# Handoff: Liga Tekken Paraguay — Website

## Overview
Marketing + community site and admin back-office for **Tekken Warriors Paraguay (TWPY)**, a Tekken 8 competitive league in Paraguay. Covers: public site (home, tournaments list, competitors/roster, rules, login), an internal admin dashboard (Challonge/Supabase-backed data ops), and a set of print/social graphics (main flier, weekly fixture cards, groups draw, ranking boards) in multiple aspect ratios (landscape for streaming overlays/Twitter, "Portada" portrait for Instagram/WhatsApp).

Visual language follows the attached **Tekken 8 Design System** (unofficial recreation of tekken.com): near-black backgrounds, hot-magenta primary accent, cyan secondary accent, italic condensed display type, diagonal-ribbon tag motif, square corners everywhere except pills/circles.

## About the Design Files
The files in this bundle are **design references built as interactive HTML prototypes** (Claude "Design Components"), not production code to copy directly. They use a bespoke template/runtime (`support.js`, `{{ }}` template holes, `<sc-for>`/`<sc-if>` loops) that only exists in the design tool — **do not** try to run these files as-is in a real app or copy their markup verbatim.

The task is to **recreate these HTML designs in the target codebase's existing environment** (React, Vue, Next.js, native mobile, etc.), using its own component patterns, state management, and data layer — or, if no stack exists yet, to choose the most appropriate framework (a React/Next.js app is a natural fit given the componentized structure below) and implement fresh from this spec.

## Fidelity
**High-fidelity (hifi).** Every screen has final colors, typography, spacing, copy (in Spanish/Guaraní-Spanish slang used by the league), and most interaction states (hover, focus, filters, search, sort, modals). Recreate pixel-accurately using the codebase's own component library where one exists; otherwise implement the styling exactly as documented below.

Two things are explicitly **mocked/static** and need real backend wiring:
- All data (players, tournaments, rankings, match history, system health, activity logs) is hardcoded sample data in the prototype's JS, standing in for a real Supabase + Challonge API integration described in the Admin Dashboard copy itself.
- The admin dashboard's "Supabase OK" health badge, service statuses, and sync timestamps are static placeholders.

## Design Tokens

### Colors (RGB triplets, used as `rgb(var(--token))` or `rgba(r,g,b,a)`)
- **Primary (hot magenta)** — `--color-primary-500: 245,10,100` (`#F50A64`). Scale 50→900 from `254,226,236` to `61,3,25`. This is the single dominant accent: CTAs, active nav underline, ribbons, glows, borders.
- **Tekken blue (cyan)** — `--color-tekken-blue-500: 63,209,231` (`#3FD1E7`), 400 `92,216,235`. Secondary accent: "VS" badges, stat highlights, secondary ribbons, links on dark login screen.
- **Dark gray / surface** — `--color-dark-gray-3-500: 11,15,23` used as card/panel background in the admin dashboard (`rgb(var(--color-dark-gray-3-500))`). True black `#000` is the page background almost everywhere else.
- **Semantic**: success `94,192,105` (green), warning `245,244,79` (yellow), error `230,0,0` (red) — used in admin dashboard health/status pills.
- **Neutrals**: white `#fff` for text; body copy typically `rgba(255,255,255,.5–.85)` for de-emphasis; hairline borders `rgba(255,255,255,.06–.18)`.
- Background treatment on public-site hero sections: `radial-gradient(120% 90% at 50% 0%, rgb(20,44,56) 0%, rgb(6,16,22) 52%, #000 100%)` plus two soft blurred glow blobs (magenta top-left, cyan top-right) at low opacity, `filter: blur(10px)`.

### Typography
- **Display font**: Bebas Neue (condensed, uppercase display face; design system substitutes for the site's paid "Bebas Neue Pro"). Used **italic** for hero H1s/wordmarks, non-italic for smaller labels/nav. Letter-spacing ranges from tight on huge hero type (`.01em`) to very wide on small eyebrow labels (`.16em`–`.28em`).
- **Body font**: Source Sans 3 (substitute for "Source Sans Pro"). Used for paragraph copy, form inputs, table cells.
- **Scale examples**: hero H1s `clamp(52px,7–9vw,86–120px)` line-height ~0.88–0.92; section eyebrow tags `14–15px` letter-spacing `.24–.28em`; nav links `19px` italic Bebas Neue; body paragraphs `15–16.5px` line-height `1.55–1.65`; big stat numbers `30–56px` Bebas Neue.

### Spacing & structure
- Section horizontal padding: `clamp(24px,5vw,72px)`. Hero vertical padding: `clamp(44px,6vw,84px)`.
- Max content width `1240px`, centered, on all public marketing pages.
- Sticky top nav: `76px` tall, `rgb(var(--color-black-500))` background, `1px solid rgba(255,255,255,.06)` bottom hairline.
- Grid gaps typically `8–26px` depending on density; card grids use CSS Grid `repeat(auto-fit/auto-fill, minmax(...))`.

### Signature motif — diagonal ribbon
Recurring "cut corner" tag shape via `clip-path: polygon(6-8% 0, 100% 0, 92-94% 100%, 0 100%)` (or the design-system's `var(--clip-banner-right)` / `var(--clip-banner-both)` in the admin dashboard) — used for eyebrow tags, filter pills, status badges, count badges. **All other corners are square** (`border-radius: 0`); the only rounded shapes are full circles (avatars, social icons, score badges) and pill-shaped `<select>` dropdowns in the admin UI (`border-radius:22px`).

### Borders / shadows / effects
- Cards: `1px solid rgba(255,255,255,.08–.12)` hairline border, sometimes a colored `border-left: 3px solid <accent>` as a rank/category indicator.
- Primary buttons: soft magenta glow `box-shadow: 0 2px 20px rgba(245,10,100,.5)`; hover state uses `filter:brightness(75-80%)` + a black 2px border appearing, not a color lighten.
- Hover motion: small translate (`translateY(-3px/-4px)` or `translateX(5-6px)`) + shadow bloom, `transition ~.25s ease`.

### Effects tokens
`var(--ease-standard)`, `var(--ease-decelerate)` — standard/decelerate cubic-bezier easing curves from the design system's `effects.css`, used on all hover/focus transitions.

## Screens / Views

### 1. Home (`Home Liga Tekken Paraguay.dc.html`)
**Purpose**: Landing/about page — brief org description, socials, credits. Lightest page in the site.
**Layout**: Sticky nav (logo left, 5 links center-right: Ranking/Torneos/Competidores/Reglamento/Login, hamburger on <880px) → single "Sobre nosotros" section on black background containing: TWPY logo (110px) + heading + body paragraph (max-width 900px), then a bottom row (wraps on mobile) with social icon row (Discord/Instagram/X/Facebook, 42px circular buttons, `rgba(255,255,255,.08)` bg → magenta on hover with lift) on the left and a "Creado con 💔 por:" credits list (3 names, cyan, bold, Source Sans 3) on the right, separated by a `1px solid rgba(255,255,255,.08)` top divider.
**Components**: Nav bar (shared across all public pages — see "Shared nav" below), social icon buttons (SVGs inline, circular, hover fill magenta + `translateY(-3px) scale(1.08)`).
**Content/copy**: "Tekken Warriors Paraguay es una comunidad con más de 15 años de trayectoria a nivel nacional e internacional..." Credits: Denis "Rushador Cuidadoso", Roxana "Rox", Rodrigo "Fate".
**Responsive**: nav collapses to a hamburger + slide-down menu under 880px (animated via a JS-computed inline style, opacity/translateY transition).

### 2. Torneos (`Torneos Liga Tekken Paraguay.dc.html`)
**Purpose**: List of all ranked tournaments in the circuit.
**Layout**: Shared nav (Torneos tab active/underlined) → hero section (radial gradient bg + 2 glow blobs, one pulsing) with eyebrow ribbon "CIRCUITO NACIONAL · TEKKEN 8", huge italic H1 "TORNEOS" (`clamp(64px,9vw,120px)`), subtitle paragraph, and a right-aligned stat block (large tournament count number + TWPY logo, 118px) → below: a full-width "featured/latest tournament" card (magenta-tinted gradient panel with cyan corner wash) showing name, formatted date, organizer, and a "VER RESULTADOS →" pill button → filter bar (organizer pills: Todos/GG Gaming Fest/Mokete Gaming/Ronin Series/TWPY, each with count; `showFilters` prop toggles this row) + a sort toggle ("MÁS RECIENTES"/"MÁS ANTIGUOS" ⇅) → a table-like list of rows, each a clickable card: big day-of-month number + month/year stack, tournament name + kind label, arrow icon; alternating row background, left accent border (cyan for most-recent, magenta otherwise), hover slides right + glows.
**Data**: 7 historical tournaments (2025-02 through 2025-11), each with ISO date, name, organizer, kind ("Torneo ranked"). Organizer color-coding: GG Gaming Fest (pink-tinted), Mokete Gaming (cyan-tinted), Ronin Series (neutral), TWPY (solid magenta).
**Footer**: dark bar, "TEKKEN WARRIORS PARAGUAY" wordmark + "¿Organizás un torneo?..." prompt.
**Tweak prop**: `showFilters` (boolean, default false in this file though marketing copy suggests it should default true — verify with stakeholder) — hides/shows the organizer filter pill row.

### 3. Competidores (`Competidores Liga Tekken Paraguay.dc.html`)
**Purpose**: Full roster/leaderboard of players who've competed.
**Layout**: Shared nav (Competidores active) → hero (same treatment as Torneos) with "ROSTER OFICIAL · TEMPORADA 2025" eyebrow, H1 "COMPETIDORES", two stacked stat counters (total competitors / ranked competitors, each with a colored left border — magenta for total, cyan for ranked) → **podium row**: top-3 ranked players as 3 cards in `auto-fit minmax(260px,1fr)` grid, each with a giant faint position-number watermark, a ribbon tag ("CAMPEÓN VIGENTE" for #1 in magenta, "N° DEL RANKING" for #2/#3 in cyan), player name, and points; toggleable via `showPodium` prop → filter/search/sort bar: 3 filter pills (Todos/Rankeados/Sin puntos with counts), a search input (nick search), and a sort toggle (points vs. A-Z) → **card grid** (`auto-fill minmax(232px,1fr)`): one card per player showing position label (#N or "S/R"), a small diamond dot color-coded by rank tier, player name, points label; top-3 get cyan accents, ranked get magenta, unranked are dim/neutral; hover lifts + glows magenta. Empty-state message when search yields nothing.
**Data**: 39 named players; ~31 have a ranking position (1–31) and points (1350 down to 70); the rest show "SIN PUNTOS"/"S/R".
**Footer**: same pattern as Torneos, with roster-specific prompt copy.
**Tweak prop**: `showPodium` (boolean, default true).

### 4. Reglamento (`Reglamento Liga Tekken Paraguay.dc.html`)
**Purpose**: Official tournament rulebook.
**Layout**: Shared nav (Reglamento active) → hero ("NORMATIVA OFICIAL · TEKKEN 8", H1 "REGLAMENTO", rule-count stat "11 REGLAS") → 4 quick-fact cards row (Formato: Eliminación doble; Finales: FT3; Inicio: 15:00 HS; Bracket: Challonge) → two-column layout: **sticky left sidebar index** (6 sections, each a numbered link with hover accent, plus a "DISCORD →" CTA button at the bottom; toggleable via `showIndex` prop) and **main rule list** grouped into 6 anchored sections (Formato de torneo, Horarios y setups, Equipamiento, En la partida, Conducta, Bracket y resultados) — each rule is a numbered row (large faint number + paragraph with bold key terms), left-accent-bordered, hover slides right + tints. One rule (equipment/disqualification, rule 05) is highlighted with a white "DESCALIFICACIÓN" ribbon tag (toggleable via `showCriticalTags` prop) and a stronger gradient background. Section 4 ("En la partida") uses cyan accents instead of magenta to visually separate it.
**Data**: 11 numbered rules total covering format, schedule, equipment (bring your own controller/arcade stick, PS5/PC compatible), stage/character-select conduct, behavior expectations, and Challonge bracket reporting process.
**Tweak props**: `showIndex` (boolean, default true), `showCriticalTags` (boolean, default true).

### 5. Login (`Login Liga Tekken Paraguay.dc.html`)
**Purpose**: Account sign-in.
**Layout**: Distinct from other pages — no sticky nav, instead a simple top bar (TWPY logo + "← VOLVER AL INICIO" link) over a full-page radial gradient background (magenta top-left, cyan bottom-right glow, subtle pulse animation). Centered two-column layout (stacks on mobile, form-first): **left** — eyebrow ribbon "LIGA TEKKEN PARAGUAY", huge italic H1 "ENTRÁ A LA / ARENA" (ARENA in magenta), supporting paragraph, and two stat callouts (15+ años de liga / 32 competidores) separated by a top divider; **right** — a bordered login form card with two thin accent bars (magenta top-right, cyan bottom-left) framing it: "TWPY" eyebrow + "LOGIN" heading, email field, password field (both light `#f1f2f3` inputs with dark text, magenta focus ring), "Recordarme" checkbox + "¿Olvidaste tu password?" link row, full-width magenta submit button "INGRESAR" (glow shadow, brightness-dim hover), an "O" divider, a Discord OAuth button (Discord-blurple hover), and a "¿No tenés cuenta? Registrate" footer line.
**Behavior**: Form submit is currently a no-op (`e.preventDefault()`) — needs real auth wiring (email/password + Discord OAuth, per copy).
**Responsive**: under 780px the grid becomes single-column with the form shown first (order swapped).

### 6. Admin Dashboard (`Admin Dashboard Liga Tekken Paraguay.dc.html`)
**Purpose**: Internal back-office for league organizers — resolving Challonge participant identities, managing players, importing/monitoring tournaments, recalculating rankings, publishing site content, and checking system health. This is the most complex screen (1264 lines) and functions as its own small SPA with client-side routing via hash-link nav + local state (no real backend — everything is mock data).
**Layout — app shell**: Fixed 250px dark sidebar (logo "TEKKEN PY / PANEL ADMIN", nav list with icon + label + badge counts for Identidades/Jugadores/Torneos/Rankings/Contenido/Sistema, user chip "Denis Barrios · Admin · TWPY" pinned to bottom) + main column with a sticky header (hamburger on mobile, current section title, green "SUPABASE OK" status pill) and a `max-width:1440px` content area that swaps between 6 sections based on active nav item.
**Sidebar collapses to an off-canvas drawer under 900px** (hamburger button in header opens it with a dark scrim overlay; close button appears in the drawer).

**Section: Identidades** (default view) — a work-queue for matching unlinked Challonge participant handles to player profiles: 3 stat tiles (Pendientes/Hoy/Fusiones) → "Participantes sin vincular" table: each row shows the raw Challonge handle + tournament/date/seed, an optional confidence-scored suggestion chip ("92% Fate_py · ACEPTAR") or "SIN COINCIDENCIA" placeholder, a search-to-link autocomplete input (dropdown of matching players with initials avatar, name, rank, tournament count), and Vincular/Crear nuevo buttons (design-system `Button` component) → a manual player registration mini-form (name input + Registrar button) for players without a Challonge account → a "Jugadores duplicados · fusionar" tool: two player `<select>` dropdowns (base player to keep / duplicate to absorb), a side-by-side comparison of both players' stats (torneos/matches/puntos/ranking + Challonge alias chips), a mobile-only condensed summary card, and a destructive-action confirm bar ("Confirmar fusión" opens a confirm modal) → recent merges/links activity log with "DESHACER" undo buttons.
**Section: Jugadores** — searchable player list (card list on mobile, data table on desktop: Jugador/Aliases/Torneos/Ranking/action) → clicking "VER PERFIL" drills into a **player detail view** (back button, editable Gamertag/Nombre real/Main fields + Guardar, a Challonge-accounts card showing alias chips with an "ACTIVA" badge or "MARCAR ACTIVA" button and a remove ×, and a match-history table: Torneo/Rival/Ronda/Resultado with W/L color coding).
**Section: Torneos** — imported-tournaments table (Torneo/Cuenta origen/Fecha/Sincronización status pill+note/Sin vincular count/actions) with an account filter dropdown, search, a "Sincronizar nuevos" primary button and "Importar torneo histórico" secondary button (opens an import modal: source-account select, URL/ID input + search, a found-tournament preview card, Cancelar/Confirmar). Clicking a row's "DETALLE" drills into a **tournament detail view** (Top 4 standings list + a placeholder "BRACKET EMBEBIDO · CHALLONGE IFRAME" box, plus a participants list with per-row linked/pending status chips).
**Section: Rankings** — year selector, "Recalcular rankings" primary button, a stale-data warning banner (shown when merges happened since last recalc), and a full ranking table (Pos/Jugador/Torneos/Puntos/Tendencia with up/down trend coloring).
**Section: Contenido** — a card grid of news posts (gradient thumbnail + published/draft status ribbon, title, date/author, Editar/toggle-publish buttons) and a "Nueva entrada" button that opens an inline post editor (Título input, Cuerpo textarea, drag-and-drop cover-image dropzone placeholder for Supabase Storage, Guardar y publicar / Guardar borrador buttons).
**Section: Sistema** — service health cards (name, colored status dot, status label, detail text, one live metric) for the platform's dependencies, plus an event log table (timestamp/level/message).
**Global overlays**: a generic confirm modal (title/body/warning strip/"I understand" checkbox gating the destructive action button — used for merge and recalculate actions), and a bottom-center toast notification (cyan-accented) for success/info messages after actions (link, create, merge, register).
**Tweak props**: `density` (enum comfortable/compact, affects table row padding), `showSuggestions` (boolean, show/hide confidence-match suggestion chips in the identity queue), `defaultSection` (enum, which of the 6 sections loads first).
**Mock data**: 11 sample players, 6 unresolved participant rows, 5 imported tournaments (with error/pending/ok sync statuses), 3 recent merge-log entries, 4 news posts, a match history sample, and simulated service-health/log entries. All of this needs to be replaced with live Supabase tables + a Challonge API integration.

### 7. Flier Principal (`Flier Principal Liga Tekken Paraguay.dc.html`)
**Purpose**: Main promotional flier/poster announcing the league's season kickoff — a single fixed-size printable/shareable graphic (built on the `doc-page` print component), not a responsive web page.
**Layout**: Full-bleed dark background with radial glows (red-magenta top corners, magenta/purple bottom corners) and 4 large faded character-portrait cutouts anchored to the four corners (Jun/King bottom, Jin/Kazuya top) behind a bottom-weighted black gradient scrim for legibility. Centered content column (top→bottom): TEKKEN 8 logo image → "INICIO DE LA / LIGA INVITACIONAL (italic, huge, glow) / DE TEKKEN PARAGUAY" three-line headline → "ORGANIZA" + TWPY logo (30cqw tall) → a bordered date/time callout box (magenta border, "INICIA: DOMINGO 9" left half + "AGOSTO / 17:00 HS" right half, divided by a vertical gradient line) → "TRANSMISIONES EN DIRECTO" line + a bordered Twitch-branded chip with streamer handle "Focus_Pocus_" → a 3-column sponsor-logos row ("ACOMPAÑAN" label + globalBox / The Dann's Box / Serial Center logos), toggleable via `showSponsors` prop.
**Units**: uses `cqw` (container query width) units throughout for the fully responsive/scalable single-page layout — a deliberate choice for a poster that must scale to any print/export size.
**Tweak prop**: `showSponsors` (boolean, default true).
**Assets needed**: real character cutout PNGs (currently `uploads/jun-faded.png`, `king-faded.png`, `jin-faded.png`, `kazuya-faded.png`), TEKKEN 8 wordmark, TWPY logo, 3 sponsor logo files — all already placed as image assets in `uploads/` (see Assets section).

### 8. Fixture — Landscape & Portada (`Fixture Liga Tekken Paraguay - Landscape.dc.html` / `...Portada.dc.html`)
**Purpose**: Weekly match-schedule graphics ("FECHA N") for each of 12 rounds of a round-robin group season — one graphic per round, generated as a scrollable stack of fixed-size canvases (1920×1080 landscape for streaming/Twitter; 1080×2340 portrait "Portada" for Instagram Stories/WhatsApp).
**Layout (per round/"fecha")**: same radial-glow dark background treatment → header row: eyebrow ribbon "LIGA INVITACIONAL · TEKKEN PARAGUAY" + huge italic "FECHA N" title on the left; a bordered date/time box + TWPY logo on the right → a row of group columns (2–3 groups depending on the round), each group topped by a magenta ribbon label ("GRUPO N") and containing 2–3 match rows: each match row shows player A's name+character (with character portrait thumbnail, toggleable via `showCharacters` prop) on the left, a cyan "VS" chevron-badge in the middle, and player B's name+character mirrored on the right; below the matches, a dashed-border "DESCANSA [player]" (bye/rest) callout → footer row: "TEMPORADA 2026" left, "TEKKEN WARRIORS PARAGUAY" right.
**Data**: 12 rounds of fixtures (Aug 9 – Oct 25, 2026, Sundays 17:00), each assigning specific named players to specific Tekken 8 characters (34 real character mappings, e.g. Wario→Jin, TWPY Rox→Xiaoyu) with per-round group compositions and bye players computed from a round-robin schedule.
**Layout logic**: match-row name font-size auto-shrinks based on name length (name with spaces gets more room before shrinking); group-columns grid width adapts when a round has fewer than 3 groups (keeps card width consistent rather than stretching).
**Tweak prop**: `showCharacters` (boolean, default true) — hides the 74px character-portrait thumbnails, showing just text if turned off.

### 9. Grupos — Landscape & Portada (`Grupos Liga Tekken Paraguay - Landscape.dc.html` / `...Portada.dc.html`)
**Purpose**: Group-draw/bracket-assignment announcement graphic (who's in which group for the season), in landscape (1300×860) and portrait "Portada" (640×1350) fixed sizes.
**Layout**: Same dark radial-glow background system as other social graphics; single fixed-size canvas per file (not a per-round loop like Fixture). Structurally mirrors the Fixture header/footer treatment (eyebrow ribbon, big italic title, footer row) with the body content being the group-to-player assignment listing.
*(Note: full body detail not exhaustively captured in this handoff — read the source file directly for the group-listing markup/data if pixel-exact recreation of this specific screen is needed; the header/footer chrome and background system match the patterns fully documented above for Fixture and Ranking.)*

### 10. Ranking — Landscape & Portada (`Ranking Liga Tekken Paraguay - Landscape.dc.html` / `...Portada.dc.html`)
**Purpose**: Shareable current-standings leaderboard graphic, landscape (1300×860) and portrait "Portada" (640×1350).
**Layout**: Same dark radial-glow background chrome as Fixture/Grupos (eyebrow ribbon, big italic title "RANKING", footer row with season/org labels). Body content is a ranked list of players with position/points, styled consistently with the Competidores page's card/row treatment (numbered rows, magenta/cyan tier accents, Bebas Neue points figures).
*(Note: as with Grupos, read the source file for exact row markup/data — the surrounding chrome and typographic system are fully specified above.)*

## Shared Nav (all public-site pages except Login and Admin)
Sticky, 76px, black background, bottom hairline border. Left: TEKKEN 8 logo (32px tall) linking home. Center-right: 5 italic Bebas Neue links (RANKING, TORNEOS, COMPETIDORES, REGLAMENTO, LOGIN) — active page's link shows a colored 2px bottom border + text-shadow glow (magenta for primary section links, cyan for Login); others show colored underline + glow only on hover. Under 880px width, links collapse into a hamburger-triggered dropdown panel (3-line icon morphs to X, panel slides down from under the nav with opacity+translateY transition, dark background, box-shadow).

## Interactions & Behavior Summary
- **Hover**: color/background shifts (never lighten — brightness-dim or accent-tint), small translate + shadow bloom, ~0.25s ease transitions throughout.
- **Focus**: form inputs get a colored border + soft glow ring (`box-shadow: 0 0 0 4px rgba(...,.18)`).
- **Filters/search/sort**: client-side, instant (Torneos organizer filter, Competidores filter/search/sort, Admin dashboard table search).
- **Mobile nav**: hamburger ↔ close (X) morph animation via 3 rotating line spans; drawer/dropdown opens with fade+slide.
- **Admin dashboard routing**: hash-anchor nav swaps visible section via component state (`nav` state key) — no real router; drill-down (player detail, tournament detail) is a second state layer with a "← volver" back button.
- **Admin destructive actions** (merge players, recalculate rankings) require an explicit confirm modal with an "I understand" checkbox before the primary button un-disables.
- **Toasts**: bottom-center, auto-dismiss ~2.8s, used to confirm link/create/merge/register actions in the admin dashboard.

## State Management (for recreation)
Each public page is mostly stateless/presentational except: mobile-nav open/closed, and (Torneos/Competidores) active filter + search query + sort direction — all trivial local component state. The Admin Dashboard needs real state management for: active section + drill-down selection, the full players/queue/tournaments/merges/posts collections (replace mock arrays with API data), form field values for every editable input, modal open/close + pending confirm action, and toast queueing. In production this should be backed by a real data layer — Supabase tables for players/tournaments/matches/posts, and a Challonge API sync job for tournament import (as described in the dashboard's own copy).

## Assets
All images referenced via relative `uploads/...` paths in this project — pull the actual files from the `uploads/` folder in this project's file tree when recreating:
- `tekken8-logo-sm.png`, `tekken8-logo-cropped.png` — TEKKEN 8 wordmark (nav + flier)
- `TWPY LOGO VARIANTES-04.png` (and a versioned `-bbddaf3b` copy) — Tekken Warriors Paraguay logo, used at multiple sizes across nearly every screen
- `jun-faded.png`, `king-faded.png`, `jin-faded.png`, `kazuya-faded.png` — faded character cutout art for the flier corners
- Character portrait thumbnails for the Fixture screens (`Jin.webp`, `Xiaoyu.webp`, `Nina.webp`, `Law.webp`, `Clive.webp`, `Panda.png`, `Kunimitsu.webp`, `Hwoarang.webp`, `Yoshimitsu.webp`, `Kazuya.webp`, `Reina.png`, `Azucena.webp`, `Eddy.webp`, `Shaheen.webp`, `Lee.webp`, `Claudio.webp`, `Victor.webp`, `Devil Jin.png`, `King.webp`, `Steve.webp`, `Bryan.webp`, `Dragunov.webp`, `Armor King.webp`, `Jack-8.webp`, `Anna.webp`, `Miary Zo.webp`) — official Tekken 8 character render crops, 74×74 thumbnails on the Fixture screens
- 3 sponsor logos for the flier: `GLOBALBOX COLOR 2026 vector-02 (1).png`, `dannsblanco.png`, `VECTORES_Mesa de trabajo 1.png`
- All SVG icons (Discord, Instagram, X, Facebook, Twitch, plus small UI glyphs like search/sort/upload/warning icons) are hand-authored inline SVG paths in the HTML — copy these paths directly, no external icon font needed.
- Fonts: Bebas Neue (display) and Source Sans 3 (body) — both free Google Fonts, loaded via the design system's `tokens/fonts.css`. These are substitutes for the site's real paid fonts (Bebas Neue Pro, Source Sans Pro / Typekit) — see the design system guide if pixel-perfect font matching against real tekken.com becomes a priority later.

## Files
- `Home Liga Tekken Paraguay.dc.html`
- `Torneos Liga Tekken Paraguay.dc.html`
- `Competidores Liga Tekken Paraguay.dc.html`
- `Reglamento Liga Tekken Paraguay.dc.html`
- `Login Liga Tekken Paraguay.dc.html`
- `Admin Dashboard Liga Tekken Paraguay.dc.html`
- `Flier Principal Liga Tekken Paraguay.dc.html`
- `Fixture Liga Tekken Paraguay - Landscape.dc.html`
- `Fixture Liga Tekken Paraguay - Portada.dc.html`
- `Grupos Liga Tekken Paraguay - Landscape.dc.html`
- `Grupos Liga Tekken Paraguay - Portada.dc.html`
- `Ranking Liga Tekken Paraguay - Landscape.dc.html`
- `Ranking Liga Tekken Paraguay - Portada.dc.html`

All copied into this handoff folder for reference. Open any of them directly in a browser to see the live, interactive design (they are fully self-contained aside from the shared `uploads/` image assets and design-system CSS/JS, which are referenced by relative path from the original project — for a truly standalone copy, re-export via the project's "Save as standalone HTML" tool).
