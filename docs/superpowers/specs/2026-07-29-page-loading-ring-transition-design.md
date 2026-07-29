# Page Loading Ring Transition — Design Spec

Date: 2026-07-29

## Overview

Replace the generic "Loading..." text in `src/app/loading.js` with the
**ring variant** of the loading/transition animation designed in Claude
Design (project `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`, file
`Transicion de Carga Liga Tekken Paraguay.dc.html`). That design file is an
interactive prototype offering three variants (`wipe`, `ring`, `bar`) with a
manual phase-machine (click → overlay → fake progress → navigate) built for
its own self-contained demo nav. Only the **ring** variant's visuals are
being ported — the phase machine is not, because it doesn't map onto how
this app actually triggers loading UI (see below).

## How this triggers in Next.js App Router

This codebase has no router-event/click-interception layer (no NProgress,
no custom `<Link>` wrapper) and none is being added for this feature. Next.js
App Router already shows the nearest `loading.js` as a Suspense fallback
whenever a route navigation suspends (e.g. a page's server component
awaiting a Supabase fetch). There is exactly one `loading.js` in the app
(`src/app/loading.js`, at the root, no route overrides it), so it already
applies to every route's navigation — no additional wiring is needed to
"activate" it.

Because `loading.js` only replaces `{children}` inside `src/app/layout.js`,
`Navbar` and `Footer` stay mounted across the transition — matching current
behavior, and meaning the new component only needs to render the ring
variant's centered "core" content, not a full-page mockup with its own nav
(that nav only existed in the design file to drive its demo).

Consequence of relying on Suspense: there is no real progress percentage
available, and no reliable signal for which route is being navigated to. Both
are handled by simulating/decorating rather than trying to reflect ground
truth (see below) — this is a deliberate simplification agreed with the
project owner, not an oversight.

## Components

### `src/components/pageLoadingRing.js` (new, client component)

Renders the ring-variant visual only:

- **Rings + logo**: ~150px box, TWPY logo centered (existing asset, already
  imported elsewhere as `twpyLogo`). Outer ring: solid `primary-500` border,
  top-accented, spinning clockwise ~2.2s linear infinite. Inner ring: dashed
  `tekken-blue-400/30`, spinning counter-clockwise ~6s. Blurred radial glow
  (`primary-500`, blurred, pulsing scale/opacity) behind both rings. Magenta
  drop-shadow on the logo.
- **Status row**: blinking magenta square dot — status text (Bebas Neue,
  wide tracking, subtle glitch-style clip flicker) — blinking cyan square
  dot. Status text is derived from simulated progress `p`:
  `p < 20` → `CONECTANDO`, `p < 52` → `DESCARGANDO`, `p < 84` →
  `SINCRONIZANDO`, else → `CASI LISTO`. (Never `LISTO` — the component
  never claims completion since it doesn't know when the real navigation
  finishes; it just unmounts when Suspense resolves.)
- **Asset label**: small muted line under the status row, cycling every
  ~650ms through a short decorative list (`ranking.json`, `fixture.json`,
  `competidores.json`, `torneos.json`, `media.cdn`). Purely cosmetic texture
  (a nod to "syncing with Supabase") — not tied to the actual destination
  route, since `loading.js` has no reliable way to know it.
- **Progress bar**: chevron-clipped bar (reuses the site's existing
  ribbon/tag clip-path motif), gradient fill magenta → cyan, diagonal
  shimmer sweep overlay, percentage number in tabular-nums magenta text
  below the bar.
- **Tip box**: "TIP" ribbon tag + one tip line, chosen once at random on
  mount (not rotating — the component is expected to be mounted briefly)
  from a short hardcoded list of TWPY/Tekken rules trivia, in the same tone
  as `Reglamento` copy (e.g. "Doble eliminación: una derrota en Winners no
  te saca del torneo.").
- **Background**: radial-gradient dark scrim
  (`rgba(12,35,44,.94)` → `rgba(3,9,13,.97)`) with `backdrop-blur`, filling
  the component's container (the design's "wipe" panels and "bar" variant's
  skeleton rows are not part of this component — those belong to the other
  two variants, which are out of scope).

**Progress simulation**: on mount, local state `p` climbs from 0 toward a
92% ceiling via `setInterval` (~70ms tick). Step size uses the same easing
curve as the source design — slows past `p > 58` (×0.75) and further past
`p > 84` (×0.35), with per-tick jitter (`0.4 + Math.random() * 1.4`
multiplier) for an organic feel — tuned so the ceiling is reached in
roughly 2.2s. If real navigation takes longer, `p` simply holds at ~92%
until the component unmounts (Suspense resolved, real page swapped in). The
interval is cleared on unmount.

### `src/app/loading.js` (rewritten)

Thin wrapper: a `flex-1 min-h-[70dvh]` container rendering
`<PageLoadingRing />`, replacing the current centered "Loading..." text.

## Styling approach

New keyframes/animations are added to `tailwind.config.js` under
`theme.extend.keyframes` / `theme.extend.animation` (following the existing
`glowPulse` / `fadeUp` pattern already there), rather than a separate
`<style>` block or CSS file:

- `ringSpin` (2.2s linear infinite) — outer ring rotation
- `ringSpinRev` (6s linear infinite, reverse direction) — inner dashed ring
- `ringPulse` — glow blob opacity/scale pulse (distinct from the existing
  `glow-pulse`, which is tuned for a slower 7s hero-background pulse; this
  one is faster/tighter to match the design source's `txPulse`, 2.6s)
- `dotBlink` — status dots (1s steps, offset by 0.5s between the two dots
  via `animation-delay`)
- `textGlitch` — status text clip-path flicker (~3.4s, source design's
  `txGlitch`)
- `barShimmer` — diagonal sweep across the progress bar fill (~1.7s linear
  infinite)

Colors use existing Tailwind tokens (`primary-500`, `tekken-blue-400`, etc.)
already registered in `tailwind.config.js` — no new color tokens needed.
Clip-path chevron shapes reuse the existing ribbon/tag `polygon(...)` motif
already used elsewhere in the rebuilt pages (see
`docs/superpowers/specs/2026-07-28-tekken-design-system-rebuild-design.md`),
inlined via Tailwind arbitrary values or a small inline style where a
dynamic width (the progress fill) requires it.

## Non-goals

- The `wipe` and `bar` variants from the design file are not implemented.
- No router-event/click-interception layer is added. The loader only shows
  when Next.js's own Suspense mechanism triggers `loading.js` — for a route
  navigation with no server-side data fetching (nothing to suspend on), the
  transition may not show at all, or may show only briefly. This is
  accepted as correct behavior, not a bug to work around.
- No real progress tracking — the percentage and asset label are simulated/
  decorative, not derived from actual fetch state.
- No changes to `src/app/admin/**` loading behavior beyond what the root
  `loading.js` already inherits (the admin dashboard is still minimal — only
  `cargar_torneo` exists today — so no admin-specific loader variant is
  being considered here).

## Testing

- Manual verification: throttle network (or add a temporary artificial
  delay to a page's data fetch) and navigate between routes to confirm the
  ring loader appears, animates correctly, and unmounts cleanly without
  leaking intervals (check for React state-update-after-unmount warnings in
  the console).
- Verify `prefers-reduced-motion` isn't a hard requirement already
  established elsewhere in this codebase (it isn't, based on current
  `design/README.md` and existing components) — no reduced-motion variant
  is being added here, consistent with the rest of the site's animated
  hover/glow effects.
