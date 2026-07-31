# Page Loading Ring Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the generic "Loading..." text in `src/app/loading.js` with the "ring variant" loading animation from the Claude Design transition prototype (spinning dual rings around the TWPY logo, glitchy status text, simulated progress bar, random tip) — this is Next.js App Router's built-in Suspense fallback, shown automatically on any route navigation that suspends.

**Architecture:** A single new client component, `src/components/ui/PageLoadingRing.js`, owns all the visual markup and the simulated-progress state (there is no real progress signal available inside a Suspense fallback, so progress is faked with an eased counter that never claims 100%). `src/app/loading.js` becomes a one-line wrapper that renders it. New CSS animations are added to `tailwind.config.js` alongside the existing `glowPulse`/`fadeUp` entries.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4. No test runner exists in this repo (`package.json` only has `dev`/`build`/`start`/`lint`) — verification is `npm run build` (which also type-checks and lints; confirmed working in this repo, ~90s) plus manual browser verification, not automated unit tests.

## Global Constraints

- Reuse existing Tailwind design tokens only (`primary-500`, `tekken-blue-400`, `font-display`, `font-body`, the `--clip-banner-right` CSS var from `src/app/globals.css`) — no new colors.
- New component lives at `src/components/ui/PageLoadingRing.js`, following the existing PascalCase convention for design-system pieces in that folder (`Button.js`, `HeroSection.js`, `RibbonTag.js`).
- The TWPY logo asset is `public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png` (already used elsewhere via static import, e.g. `src/components/footer.js`).
- No router-event/click-interception layer, no new dependencies. Only the `ring` variant is implemented — `wipe` and `bar` are explicitly out of scope.
- Simulated progress must never reach 100% (ceiling 92) and must clear its `setInterval` on unmount — no state-update-after-unmount warnings.
- Full spec: `docs/superpowers/specs/2026-07-29-page-loading-ring-transition-design.md`.

---

### Task 1: Add ring-loader animation keyframes to Tailwind config

**Files:**
- Modify: `tailwind.config.js` (the `theme.extend.keyframes` and `theme.extend.animation` objects, currently containing only `glowPulse`/`fadeUp` and `glow-pulse`/`fade-up`)

**Interfaces:**
- Produces: six Tailwind animation utility classes consumed by Task 2 — `animate-ring-spin`, `animate-ring-spin-rev`, `animate-ring-pulse`, `animate-dot-blink`, `animate-text-glitch`, `animate-bar-shimmer`.

- [ ] **Step 1: Add the new keyframes**

In `tailwind.config.js`, inside `theme.extend.keyframes`, add these entries after the existing `fadeUp` entry:

```js
        ringSpin: { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        ringSpinRev: { from: { transform: "rotate(360deg)" }, to: { transform: "rotate(0deg)" } },
        ringPulse: {
          "0%, 100%": { opacity: 0.5, transform: "scale(1)" },
          "50%": { opacity: 1, transform: "scale(1.07)" },
        },
        dotBlink: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.12 } },
        textGlitch: {
          "0%, 92%, 100%": { clipPath: "inset(0 0 0 0)", transform: "translateX(0)" },
          "94%": { clipPath: "inset(18% 0 62% 0)", transform: "translateX(-4px)" },
          "96%": { clipPath: "inset(58% 0 22% 0)", transform: "translateX(5px)" },
          "98%": { clipPath: "inset(38% 0 44% 0)", transform: "translateX(-2px)" },
        },
        barShimmer: {
          "0%": { transform: "translateX(-140%)" },
          "100%": { transform: "translateX(340%)" },
        },
```

So the full `keyframes` object reads:

```js
      keyframes: {
        glowPulse: { "0%, 100%": { opacity: 0.55 }, "50%": { opacity: 0.9 } },
        fadeUp: {
          from: { opacity: 0, transform: "translateY(24px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
        ringSpin: { from: { transform: "rotate(0deg)" }, to: { transform: "rotate(360deg)" } },
        ringSpinRev: { from: { transform: "rotate(360deg)" }, to: { transform: "rotate(0deg)" } },
        ringPulse: {
          "0%, 100%": { opacity: 0.5, transform: "scale(1)" },
          "50%": { opacity: 1, transform: "scale(1.07)" },
        },
        dotBlink: { "0%, 100%": { opacity: 1 }, "50%": { opacity: 0.12 } },
        textGlitch: {
          "0%, 92%, 100%": { clipPath: "inset(0 0 0 0)", transform: "translateX(0)" },
          "94%": { clipPath: "inset(18% 0 62% 0)", transform: "translateX(-4px)" },
          "96%": { clipPath: "inset(58% 0 22% 0)", transform: "translateX(5px)" },
          "98%": { clipPath: "inset(38% 0 44% 0)", transform: "translateX(-2px)" },
        },
        barShimmer: {
          "0%": { transform: "translateX(-140%)" },
          "100%": { transform: "translateX(340%)" },
        },
      },
```

- [ ] **Step 2: Add the matching animation entries**

In the same file, inside `theme.extend.animation`, add these entries after the existing `"fade-up"` entry so the full object reads:

```js
      animation: {
        "glow-pulse": "glowPulse 7s ease-in-out infinite",
        "fade-up": "fadeUp .6s cubic-bezier(.4,0,.2,1) both",
        "ring-spin": "ringSpin 2.2s linear infinite",
        "ring-spin-rev": "ringSpinRev 6s linear infinite",
        "ring-pulse": "ringPulse 2.6s ease-in-out infinite",
        "dot-blink": "dotBlink 1s steps(1,end) infinite",
        "text-glitch": "textGlitch 3.4s steps(1,end) infinite",
        "bar-shimmer": "barShimmer 1.7s linear infinite",
      },
```

- [ ] **Step 3: Verify the config is valid**

Run: `npm run build`
Expected: build succeeds (`✓ Compiled successfully` ... `✓ Generating static pages (22/22)`), same as the pre-change baseline. These new keyframes/animations aren't consumed by any class yet, so Tailwind will purge them from output CSS — this step only confirms the config file itself is valid JS that Tailwind can load without throwing.

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.js
git commit -m "feat: add ring-loader animation keyframes to Tailwind config"
```

---

### Task 2: Build PageLoadingRing and wire it into loading.js

**Files:**
- Create: `src/components/ui/PageLoadingRing.js`
- Modify: `src/app/loading.js` (currently a static `<div>` with the text "Loading...")

**Interfaces:**
- Consumes: `animate-ring-spin`, `animate-ring-spin-rev`, `animate-ring-pulse`, `animate-dot-blink`, `animate-text-glitch`, `animate-bar-shimmer` (Task 1). `--clip-banner-right` CSS var (`src/app/globals.css:50`). Static logo import path `../../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png` (3 levels up from `src/components/ui/`).
- Produces: default export `PageLoadingRing` (no props) — a self-contained `<div>` (flex, `flex-1 min-h-[70dvh]`) meant to be the entire body of `src/app/loading.js`.

- [ ] **Step 1: Create the component**

Write `src/components/ui/PageLoadingRing.js`:

```jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";

import twpyLogo from "../../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

const ASSETS = ["ranking.json", "fixture.json", "competidores.json", "torneos.json", "media.cdn"];

const TIPS = [
  "Doble eliminación: una derrota en Winners no te saca del torneo.",
  "Sets de grupos al mejor de 3; finales al mejor de 5.",
  "Confirmá tu asistencia antes del cierre de inscripciones.",
  "Revisá tu seed en el fixture antes de que arranque la ronda.",
  "Los rankings se recalculan apenas se cierra cada torneo.",
];

const PROGRESS_CEILING = 92;
const TICK_MS = 70;
const TARGET_MS = 2200;
const STEP = 100 / (TARGET_MS / TICK_MS);

function statusFor(p) {
  if (p < 20) return "CONECTANDO";
  if (p < 52) return "DESCARGANDO";
  if (p < 84) return "SINCRONIZANDO";
  return "CASI LISTO";
}

export default function PageLoadingRing() {
  const [p, setP] = useState(0);
  const [assetIndex, setAssetIndex] = useState(0);
  const tip = useMemo(() => TIPS[Math.floor(Math.random() * TIPS.length)], []);

  useEffect(() => {
    const progressTimer = setInterval(() => {
      setP((prev) => {
        if (prev >= PROGRESS_CEILING) return prev;
        const slow = prev > 84 ? 0.35 : prev > 58 ? 0.75 : 1.35;
        const jitter = 0.4 + Math.random() * 1.4;
        return Math.min(PROGRESS_CEILING, prev + STEP * slow * jitter);
      });
    }, TICK_MS);
    return () => clearInterval(progressTimer);
  }, []);

  useEffect(() => {
    const assetTimer = setInterval(() => {
      setAssetIndex((i) => (i + 1) % ASSETS.length);
    }, 620);
    return () => clearInterval(assetTimer);
  }, []);

  const pct = Math.floor(p);

  return (
    <div className="flex flex-1 min-h-[70dvh] items-center justify-center overflow-hidden bg-[radial-gradient(120%_90%_at_50%_45%,rgba(12,35,44,.94)_0%,rgba(3,9,13,.97)_70%)]">
      <div className="flex flex-col items-center gap-6 px-6 text-center">
        <div className="relative flex h-[clamp(120px,15vw,168px)] w-[clamp(120px,15vw,168px)] items-center justify-center">
          <div className="absolute inset-0 animate-ring-spin rounded-full border border-primary-500/30 border-t-primary-500" />
          <div className="absolute inset-3 animate-ring-spin-rev rounded-full border border-dashed border-tekken-blue-400/30" />
          <div className="absolute -inset-3.5 animate-ring-pulse rounded-full bg-[radial-gradient(circle,rgba(245,10,100,.35)_0%,transparent_68%)] blur-[12px]" />
          <Image
            src={twpyLogo}
            alt=""
            className="relative h-auto w-[62%] drop-shadow-[0_0_18px_rgba(245,10,100,.65)]"
          />
        </div>

        <div className="flex flex-col items-center gap-2.5">
          <div className="flex items-center gap-2.5">
            <span className="h-[7px] w-[7px] animate-dot-blink bg-primary-500" />
            <span className="animate-text-glitch font-display text-[clamp(20px,2.6vw,30px)] tracking-[0.26em] text-white">
              {statusFor(p)}
            </span>
            <span className="h-[7px] w-[7px] animate-dot-blink bg-tekken-blue-400 [animation-delay:.5s]" />
          </div>
          <span className="text-xs uppercase tracking-[0.2em] text-white/45">
            GET /{ASSETS[assetIndex]}
          </span>
        </div>

        <div className="flex w-[min(460px,72vw)] flex-col gap-2.5">
          <div className="relative h-3 overflow-hidden border border-white/[.14] bg-white/[.07] [clip-path:polygon(10px_0,100%_0,calc(100%_-_10px)_100%,0_100%)]">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 via-primary-500 to-tekken-blue-400"
              style={{ width: `${p}%` }}
            />
            <div className="pointer-events-none absolute inset-0 w-[26%] animate-bar-shimmer bg-gradient-to-r from-transparent via-white/50 to-transparent" />
          </div>
          <div className="flex items-center justify-between font-display text-sm tracking-[0.16em] text-white/55">
            <span>Cargando…</span>
            <span className="text-xl tabular-nums text-primary-500">{pct}%</span>
          </div>
        </div>

        <div className="flex max-w-[min(600px,84vw)] items-stretch">
          <span className="flex flex-shrink-0 items-center bg-primary-500 px-5 py-1.5 font-display text-sm tracking-[0.24em] text-white [clip-path:var(--clip-banner-right)]">
            TIP
          </span>
          <span className="border border-l-0 border-white/10 bg-white/[.05] px-4 py-1.5 text-left text-[13.5px] leading-[1.45] text-white/80">
            {tip}
          </span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Wire it into `src/app/loading.js`**

Replace the full contents of `src/app/loading.js` with:

```jsx
import PageLoadingRing from "@/components/ui/PageLoadingRing";

export default function Loading() {
  return <PageLoadingRing />;
}
```

- [ ] **Step 3: Verify the build**

Run: `npm run build`
Expected: succeeds the same way as Task 1's Step 3 (`✓ Compiled successfully`, all 22 routes generated), with no new warnings. This time the new animation classes are actually referenced, so this also confirms Tailwind picks them up without error.

- [ ] **Step 4: Manually verify the animation in the browser**

The dev server won't naturally hold on the loading state long enough to inspect it (local Supabase queries resolve fast). Temporarily force a delay to observe it:

1. Open `src/app/ranking/page.js` and add a delay as the first line inside `RankingPage`, before the existing `Promise.all` call:
   ```js
   await new Promise((resolve) => setTimeout(resolve, 3000));
   ```
2. Run `npm run dev`, open `http://localhost:3000`, and navigate to `/ranking` (or reload it directly).
3. Confirm: the dual rings spin (outer clockwise, inner dashed counter-clockwise) around the TWPY logo with a pulsing magenta glow behind it; the status text cycles CONECTANDO → DESCARGANDO → SINCRONIZANDO → CASI LISTO with the glitch flicker; the two dots blink out of phase; the progress bar fills and shimmers, the percentage counts up and never hits 100; the tip line shows one fixed tip; the site's Navbar and Footer remain visible/unaffected above and below it.
4. Open the browser devtools console and confirm there are no React warnings about setting state on an unmounted component after the ranking page finishes loading.
5. Remove the temporary `await new Promise(...)` line from `src/app/ranking/page.js` — do not commit it.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/PageLoadingRing.js src/app/loading.js
git commit -m "feat: add ring-variant page loading transition"
```
