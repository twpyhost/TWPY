# Tekken 8 Design System Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild TWPY's public site (Home, Ranking, Competidores, Reglamento, Login) onto the Tekken 8 design system tokens/components, replacing the current ad-hoc styling.

**Architecture:** A design-token foundation (Tailwind color/font/effect tokens copied from the Claude Design project, `globals.css` CSS custom properties) plus three shared primitives (`RibbonTag`, `Button`, `HeroSection`) that every page composes. `Navbar` and `Footer` are rebuilt once and shared by every page except Login, which keeps the distinct top-bar layout already in the design. Existing Next.js routes and the `src/lib/data` facade (`getRankings`, `getCompetidores`, etc.) are unchanged — only presentation, plus a new Discord OAuth path for Login.

**Tech Stack:** Next.js 15 (App Router), React 19, Tailwind CSS 3.4, `next/font/google`, Supabase (`@supabase/ssr`, `@supabase/supabase-js`).

## Global Constraints

- Full spec: `docs/superpowers/specs/2026-07-28-tekken-design-system-rebuild-design.md`. Design source files: `design/*.dc.html` (read `design/README.md` first).
- **No test framework exists in this repo** (no jest/vitest/RTL in `package.json`). Per `CLAUDE.md`, frontend changes are verified by running the dev server and checking the feature in a browser, not by unit tests. Every task's verification step is: `npm run build` (or `npm run lint`) passes, plus a Playwright MCP browser check (`mcp__plugin_playwright_playwright__browser_navigate` + `browser_snapshot`/`browser_take_screenshot`) against `npm run dev` on `localhost:3000`. Do not introduce a test framework as part of this plan.
- **Out of scope, do not touch or break:** `src/app/torneos/**`, `src/app/auth/register/**`, `src/app/admin/**`, `src/components/loadingButton.js`, `src/components/seeRankingButton.js`, `src/components/table.js`, `src/components/year.js`. These keep their current styling. Do not remove the `tekken-pink` Tailwind color or the `.clip-path-cta` CSS class — `seeRankingButton.js`, `torneos/page.js`, and `auth/register/page.js` still depend on them.
- **Home page's hero JSX must not change** (`src/app/page.js` — the "Bienvenido al Ranking..." section with the Jin/Kazuya images and `SeeRankingButton`). Only the global chrome around it (Navbar, Footer, fonts, page background) changes.
- Admin Dashboard is explicitly **not** part of this plan (needs its own spec/plan — see spec's Open Items).
- All new/rewritten UI copy is Spanish, matching the strings already used in the current pages or the `design/*.dc.html` source files verbatim.
- Data layer is not touched: `getTorneos`, `getRankings`, `getCompetidores`, `getFiltroAno`, `getTorneoResultados` (from `@/lib/data` via `src/app/utils/db.js`) keep their existing signatures and return shapes.

---

### Task 1: CLAUDE.md pointer to design/docs folders

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** None (documentation only).

- [ ] **Step 1: Add a "Design & specs" section to `CLAUDE.md`**

Add this section right after the "Architecture" section (before "Core domain model & business rules"):

```markdown
---

## Design & specs

- `design/` — Claude Design handoff for the Tekken 8 visual system (source of truth for UI). Read `design/README.md` first; the `.dc.html` files are interactive design references, not code to copy verbatim (see that README for why). The live Claude Design project is `a8f8a0e5-4dfe-4ac2-8e1b-39351e40cd7a`.
- `docs/superpowers/specs/` — feature design specs (brainstorming output) written before implementation plans.
- `docs/superpowers/plans/` — implementation plans, one per spec.
- `docs/admin-dashboard-brief.md`, `docs/infrastructure.md` — standalone briefs referenced elsewhere in this file.

---
```

- [ ] **Step 2: Verify**

Read the file back and confirm the section renders as valid markdown (headers, no broken fences) and sits between "Architecture" and "Core domain model & business rules".

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: point CLAUDE.md at design/ and docs/superpowers/ folders"
```

---

### Task 2: Design tokens — Tailwind config + globals.css

**Files:**
- Modify: `tailwind.config.mjs`
- Modify: `src/app/globals.css`

**Interfaces:**
- Produces: Tailwind color scales `primary.{50-900}`, `tekken-blue.{50-900}`, `dark-gray-3.{50-900}`, `success`, `warning`, `error`; `fontFamily.display` / `fontFamily.body`; `borderRadius.pill`; `boxShadow.glow-primary` / `boxShadow.glow-cyan`; `animation.glow-pulse` / `animation.fade-up`. CSS custom properties `--clip-banner-both`, `--clip-banner-right`, `--clip-banner-left`, `--ease-standard` (used later via Tailwind arbitrary-value syntax, e.g. `[clip-path:var(--clip-banner-both)]`).
- Consumes: nothing new (keeps existing `tekken-pink` color and `.clip-path-cta` class untouched).

- [ ] **Step 1: Replace `tailwind.config.mjs`**

```js
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        warsaw: ["var(--font-warsaw)"],
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",

        // Legacy — still used by src/app/torneos, src/app/auth/register,
        // src/components/seeRankingButton.js. Do not remove.
        "tekken-pink": "#F50A64",

        primary: {
          50: "rgb(var(--color-primary-50) / <alpha-value>)",
          100: "rgb(var(--color-primary-100) / <alpha-value>)",
          200: "rgb(var(--color-primary-200) / <alpha-value>)",
          300: "rgb(var(--color-primary-300) / <alpha-value>)",
          400: "rgb(var(--color-primary-400) / <alpha-value>)",
          500: "rgb(var(--color-primary-500) / <alpha-value>)",
          600: "rgb(var(--color-primary-600) / <alpha-value>)",
          700: "rgb(var(--color-primary-700) / <alpha-value>)",
          800: "rgb(var(--color-primary-800) / <alpha-value>)",
          900: "rgb(var(--color-primary-900) / <alpha-value>)",
        },
        "tekken-blue": {
          50: "rgb(var(--color-tekken-blue-50) / <alpha-value>)",
          100: "rgb(var(--color-tekken-blue-100) / <alpha-value>)",
          200: "rgb(var(--color-tekken-blue-200) / <alpha-value>)",
          300: "rgb(var(--color-tekken-blue-300) / <alpha-value>)",
          400: "rgb(var(--color-tekken-blue-400) / <alpha-value>)",
          500: "rgb(var(--color-tekken-blue-500) / <alpha-value>)",
          600: "rgb(var(--color-tekken-blue-600) / <alpha-value>)",
          700: "rgb(var(--color-tekken-blue-700) / <alpha-value>)",
          800: "rgb(var(--color-tekken-blue-800) / <alpha-value>)",
          900: "rgb(var(--color-tekken-blue-900) / <alpha-value>)",
        },
        "dark-gray-3": {
          50: "rgb(var(--color-dark-gray-3-50) / <alpha-value>)",
          100: "rgb(var(--color-dark-gray-3-100) / <alpha-value>)",
          200: "rgb(var(--color-dark-gray-3-200) / <alpha-value>)",
          300: "rgb(var(--color-dark-gray-3-300) / <alpha-value>)",
          400: "rgb(var(--color-dark-gray-3-400) / <alpha-value>)",
          500: "rgb(var(--color-dark-gray-3-500) / <alpha-value>)",
          600: "rgb(var(--color-dark-gray-3-600) / <alpha-value>)",
          700: "rgb(var(--color-dark-gray-3-700) / <alpha-value>)",
          800: "rgb(var(--color-dark-gray-3-800) / <alpha-value>)",
          900: "rgb(var(--color-dark-gray-3-900) / <alpha-value>)",
        },
        success: "rgb(var(--color-success-500) / <alpha-value>)",
        warning: "rgb(var(--color-warning-500) / <alpha-value>)",
        error: "rgb(var(--color-error-500) / <alpha-value>)",
      },
      borderRadius: {
        none: "0px",
        pill: "30px",
      },
      boxShadow: {
        "glow-primary":
          "0 2px 20px rgba(245,10,100,.5), 0 6px 15px rgba(245,10,100,.25)",
        "glow-cyan": "0 2px 20px rgba(63,209,231,.5)",
      },
      keyframes: {
        glowPulse: { "0%, 100%": { opacity: 0.55 }, "50%": { opacity: 0.9 } },
        fadeUp: {
          from: { opacity: 0, transform: "translateY(24px)" },
          to: { opacity: 1, transform: "translateY(0)" },
        },
      },
      animation: {
        "glow-pulse": "glowPulse 7s ease-in-out infinite",
        "fade-up": "fadeUp .6s cubic-bezier(.4,0,.2,1) both",
      },
    },
  },
};
```

- [ ] **Step 2: Replace `src/app/globals.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #000000;
  --foreground: #ffffff;

  /* Tekken 8 design system color tokens. Space-separated triplets (not the
     source design system's comma-separated tokens/colors.css format) so
     Tailwind's rgb(var(--x) / <alpha-value>) syntax works. */
  --color-primary-50: 254 226 236;
  --color-primary-100: 252 182 209;
  --color-primary-200: 250 133 178;
  --color-primary-300: 248 84 147;
  --color-primary-400: 247 47 123;
  --color-primary-500: 245 10 100;
  --color-primary-600: 213 9 87;
  --color-primary-700: 172 7 70;
  --color-primary-800: 132 5 54;
  --color-primary-900: 61 3 25;

  --color-tekken-blue-50: 232 249 252;
  --color-tekken-blue-100: 197 241 248;
  --color-tekken-blue-200: 159 232 243;
  --color-tekken-blue-300: 121 223 238;
  --color-tekken-blue-400: 92 216 235;
  --color-tekken-blue-500: 63 209 231;
  --color-tekken-blue-600: 55 182 201;
  --color-tekken-blue-700: 44 146 162;
  --color-tekken-blue-800: 34 113 125;
  --color-tekken-blue-900: 16 52 58;

  --color-dark-gray-3-50: 226 226 227;
  --color-dark-gray-3-100: 182 183 185;
  --color-dark-gray-3-200: 133 135 139;
  --color-dark-gray-3-300: 84 87 93;
  --color-dark-gray-3-400: 48 51 58;
  --color-dark-gray-3-500: 11 15 23;
  --color-dark-gray-3-600: 10 13 20;
  --color-dark-gray-3-700: 8 11 16;
  --color-dark-gray-3-800: 6 8 12;
  --color-dark-gray-3-900: 3 4 6;

  --color-success-500: 94 192 105;
  --color-warning-500: 245 244 79;
  --color-error-500: 230 0 0;

  --clip-banner-both: polygon(10% 0%, 100% 0, 90% 100%, 0% 100%);
  --clip-banner-right: polygon(0% 0%, 100% 0, 82% 100%, 0% 100%);
  --clip-banner-left: polygon(0% 0%, 100% 0, 100% 100%, 18% 100%);
  --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);
}

body {
  color: var(--foreground);
  background: var(--background);
}

/* Legacy utility — still used by src/app/torneos, src/app/auth/register,
   src/components/seeRankingButton.js. Do not remove. */
.clip-path-cta {
  clip-path: polygon(10% 0, 100% 0, 100% 70%, 90% 100%, 0 100%, 0 30%);
}
```

- [ ] **Step 3: Verify the build compiles**

Run: `npm run build`
Expected: build succeeds with no Tailwind/CSS errors (unused-file warnings about other pages are fine — no page consumes the new tokens yet).

- [ ] **Step 4: Commit**

```bash
git add tailwind.config.mjs src/app/globals.css
git commit -m "feat: add Tekken 8 design system color/font/effect tokens to Tailwind"
```

---

### Task 3: Fonts + root layout chrome

**Files:**
- Modify: `src/app/layout.js`

**Interfaces:**
- Consumes: `--font-display` / `--font-body` CSS vars (Task 2's `fontFamily.display`/`fontFamily.body`).
- Produces: `<body>` now carries `font-body` as the sitewide default font (was `font-warsaw`); page background is solid black (was a magenta→cyan gradient div wrapping `{children}`).

- [ ] **Step 1: Replace `src/app/layout.js`**

```js
import { Bebas_Neue, Source_Sans_3 } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

import Navbar from "@/components/navbar";
import Footer from "@/components/footer";
import { Toaster } from "react-hot-toast";

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
});

const sourceSans3 = Source_Sans_3({
  weight: ["400", "600", "700"],
  style: ["normal", "italic"],
  subsets: ["latin"],
  variable: "--font-body",
});

// Kept for src/app/torneos and src/app/auth/register, which still use
// font-warsaw explicitly via inherited body styling in a few spots — see
// Global Constraints in the implementation plan.
const warsaw = localFont({
  src: [
    {
      path: "../../public/fonts/WarsawGothic.otf",
      weight: "700",
    },
  ],
  variable: "--font-warsaw",
});

export const metadata = {
  title: "Tekken Warriors PY",
  description:
    "Ranked de participantes de los torneos de Tekken Warriors Paraguay",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body
        className={`${bebasNeue.variable} ${sourceSans3.variable} ${warsaw.variable} flex min-h-screen flex-col bg-black font-body antialiased`}
      >
        <Toaster />
        <Navbar />
        {children}
        <Footer />
      </body>
    </html>
  );
}
```

Note: this drops the unused `Geist`/`Geist_Mono` font imports (grepped — nothing in `src/` references `--font-geist-sans`, `--font-geist-mono`, `font-sans`, or `font-mono`).

- [ ] **Step 2: Verify the build compiles**

Run: `npm run build`
Expected: succeeds. `Navbar`/`Footer` still export their current (pre-rebuild) content at this point, so this is a font/background-only change.

- [ ] **Step 3: Commit**

```bash
git add src/app/layout.js
git commit -m "feat: swap root layout to Bebas Neue/Source Sans 3 and drop gradient background"
```

---

### Task 4: Shared UI primitives — RibbonTag, Button, HeroSection

**Files:**
- Create: `src/components/ui/RibbonTag.js`
- Create: `src/components/ui/Button.js`
- Create: `src/components/ui/HeroSection.js`

**Interfaces:**
- Consumes: Task 2's `primary`/`tekken-blue` colors, `--clip-banner-both`, `shadow-glow-primary`, `animation.glow-pulse`.
- Produces:
  - `RibbonTag({ children, variant = "primary" | "cyan" | "white", className })` — clipped eyebrow/badge label.
  - `Button({ href, variant = "primary" | "outline", className, children, ...props })` — renders a `next/link` `<Link>` when `href` is passed, otherwise a `<button>`; spreads remaining props (`type`, `onClick`, `disabled`, etc.).
  - `HeroSection({ children, className })` — radial-gradient dark background + two blurred glow blobs, wraps `children` in a `position:relative;z-index:2` layer.

- [ ] **Step 1: Create `src/components/ui/RibbonTag.js`**

```jsx
const VARIANTS = {
  primary: "bg-primary-500 text-white",
  cyan: "bg-tekken-blue-400 text-[#04121a]",
  white: "bg-white text-[#0a0a0a]",
};

export default function RibbonTag({ children, variant = "primary", className = "" }) {
  return (
    <span
      className={`inline-flex self-start whitespace-nowrap px-5 py-1 font-display text-sm tracking-[0.24em] [clip-path:var(--clip-banner-both)] ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
```

- [ ] **Step 2: Create `src/components/ui/Button.js`**

```jsx
import Link from "next/link";

const BASE =
  "inline-flex items-center justify-center gap-2 border-2 border-transparent font-display italic tracking-[0.06em] transition-[filter,border-color] duration-300";

const VARIANTS = {
  primary:
    "bg-primary-500 text-white shadow-glow-primary hover:border-black hover:brightness-[.8]",
  outline: "border-white/15 bg-white/[.04] text-white hover:bg-white/10",
};

export default function Button({
  href,
  variant = "primary",
  className = "",
  children,
  ...props
}) {
  const classes = `${BASE} ${VARIANTS[variant]} ${className}`;

  if (href) {
    return (
      <Link href={href} className={classes} {...props}>
        {children}
      </Link>
    );
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Create `src/components/ui/HeroSection.js`**

```jsx
export default function HeroSection({ children, className = "" }) {
  return (
    <section className={`relative overflow-hidden ${className}`}>
      <div className="absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_0%,rgb(20,44,56)_0%,rgb(6,16,22)_52%,#000_100%)]" />
      <div className="absolute -left-[14%] -top-[32%] h-[110%] w-[58%] animate-glow-pulse rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(245,10,100,.34)_0%,rgba(230,0,0,.1)_46%,transparent_72%)] blur-[10px]" />
      <div className="absolute -right-[16%] -top-[36%] h-[110%] w-[58%] rounded-full bg-[radial-gradient(circle_at_50%_45%,rgba(63,209,231,.3)_0%,rgba(30,120,220,.1)_46%,transparent_72%)] blur-[10px]" />
      <div className="relative z-[2]">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Verify the build compiles**

Run: `npm run build`
Expected: succeeds (these components have no consumers yet — full visual verification happens in Task 8, the first page that uses them).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/RibbonTag.js src/components/ui/Button.js src/components/ui/HeroSection.js
git commit -m "feat: add RibbonTag, Button, HeroSection design-system primitives"
```

---

### Task 5: Rebuild Navbar

**Files:**
- Modify: `src/components/navbar.js`

**Interfaces:**
- Consumes: `useUserSession()` from `src/components/userSession.js` (unchanged — `{ user, isAdmin }`), Task 2 color/font tokens.
- Produces: `Navbar` now returns `null` on `/auth/login` (Login owns its own top bar).

- [ ] **Step 1: Replace `src/components/navbar.js`**

```jsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import toast from "react-hot-toast";

import { useUserSession } from "@/components/userSession";
import logo from "../../public/images/misc/tekken8-logo-sm.png";

const NAV_ITEMS = [
  { name: "RANKING", href: "/ranking" },
  { name: "TORNEOS", href: "/torneos" },
  { name: "COMPETIDORES", href: "/competidores" },
  { name: "REGLAMENTO", href: "/reglamento" },
];

const LOGIN_ITEM = { name: "LOGIN", href: "/auth/login" };

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [menuAdminOpen, setMenuAdminOpen] = useState(false);
  const { user, isAdmin } = useUserSession();

  if (pathname === "/auth/login") {
    return null;
  }

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) {
        throw new Error("No se pudo cerrar sesion");
      }

      toast.success("Has cerrado sesion correctamente.");
      setMenuAdminOpen(false);
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <nav className="sticky top-0 z-50 flex h-[76px] items-center justify-between border-b border-white/[.06] bg-black px-5 sm:px-8 lg:px-14">
      <Link href="/" className="flex items-center">
        <Image src={logo} alt="TEKKEN 8" height={32} className="h-8 w-auto" />
      </Link>

      <div
        className={`${
          isOpen
            ? "flex translate-y-0 opacity-100"
            : "pointer-events-none flex -translate-y-2 opacity-0 md:pointer-events-auto md:translate-y-0 md:opacity-100"
        } absolute left-0 right-0 top-[76px] flex-col gap-1 border-b border-white/10 bg-black px-5 py-4 shadow-lg transition-all duration-300 ease-in-out md:static md:flex-row md:items-center md:gap-8 md:border-0 md:bg-transparent md:p-0 md:shadow-none`}
      >
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setIsOpen(false)}
            className={`border-b-2 py-2 font-display text-[19px] italic tracking-[0.05em] transition-colors duration-300 md:py-0 ${
              pathname === item.href
                ? "border-primary-500 text-primary-500 [text-shadow:0_0_14px_rgba(245,10,100,.65)]"
                : "border-transparent text-white hover:border-primary-500 hover:text-primary-500"
            }`}
          >
            {item.name}
          </Link>
        ))}
        {!user && (
          <Link
            href={LOGIN_ITEM.href}
            onClick={() => setIsOpen(false)}
            className={`border-b-2 py-2 font-display text-[19px] italic tracking-[0.05em] transition-colors duration-300 md:py-0 ${
              pathname === LOGIN_ITEM.href
                ? "border-tekken-blue-400 text-tekken-blue-400 [text-shadow:0_0_14px_rgba(63,209,231,.65)]"
                : "border-transparent text-white/75 hover:border-tekken-blue-400 hover:text-tekken-blue-400"
            }`}
          >
            {LOGIN_ITEM.name}
          </Link>
        )}
        {user && (
          <div className="relative md:ml-4">
            <button
              onClick={() => setMenuAdminOpen(!menuAdminOpen)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-tekken-blue-500 font-body text-sm font-bold text-black"
            >
              {user.email[0].toUpperCase()}
            </button>
            {menuAdminOpen && (
              <div className="absolute right-0 z-50 mt-2 w-40 rounded bg-white text-right text-sm text-black shadow-lg">
                {isAdmin && (
                  <Link
                    href="/admin/cargar_torneo"
                    className="block rounded px-4 py-2 hover:bg-gray-200"
                  >
                    Cargar torneo
                  </Link>
                )}
                <button
                  onClick={logout}
                  className="w-full rounded px-4 py-2 text-right hover:bg-gray-200"
                >
                  Cerrar sesion
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Menú"
        className="relative flex h-11 w-11 items-center justify-center border border-white/[.14] bg-white/[.06] text-white md:hidden"
      >
        <span
          className={`absolute left-1/2 h-0.5 w-5 -translate-x-1/2 rounded bg-white transition-all duration-300 ${
            isOpen ? "top-1/2 rotate-45" : "top-[calc(50%-6px)] rotate-0"
          }`}
        />
        <span
          className={`absolute left-1/2 top-1/2 h-0.5 w-5 -translate-x-1/2 -translate-y-1/2 rounded bg-white transition-opacity duration-300 ${
            isOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`absolute left-1/2 h-0.5 w-5 -translate-x-1/2 rounded bg-white transition-all duration-300 ${
            isOpen ? "top-1/2 -rotate-45" : "top-[calc(50%+6px)] rotate-0"
          }`}
        />
      </button>
    </nav>
  );
}
```

- [ ] **Step 2: Run dev server and verify with Playwright**

Run: `npm run dev` (background)
Then use `mcp__plugin_playwright_playwright__browser_navigate` to `http://localhost:3000/`, then `browser_snapshot` to confirm: sticky black nav, 5 links + LOGIN visible, TEKKEN 8 logo on the left. Resize the viewport below 880px (`browser_resize`) and confirm the hamburger button appears and toggles the dropdown panel (`browser_click`). Navigate to `http://localhost:3000/auth/login` and confirm the nav does **not** render.

- [ ] **Step 3: Commit**

```bash
git add src/components/navbar.js
git commit -m "feat: rebuild Navbar on Tekken 8 design tokens, hide on /auth/login"
```

---

### Task 6: Rebuild Footer

**Files:**
- Modify: `src/components/footer.js`

**Interfaces:**
- Produces: `Footer` now returns `null` on `/auth/login`; same "Sobre nosotros" content (logo, paragraph, socials, credits) as before, restyled.

- [ ] **Step 1: Replace `src/components/footer.js`**

```jsx
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

import twpyLogo from "../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

const SOCIAL_LINKS = [
  {
    name: "Discord",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.457.881-.63 1.283a18.27 18.27 0 0 0-5.51 0A11.5 11.5 0 0 0 9.115 3 19.79 19.79 0 0 0 4.683 4.369C1.61 8.86.79 13.24 1.16 17.56a19.9 19.9 0 0 0 5.993 3.04c.483-.66.913-1.36 1.28-2.098a12.9 12.9 0 0 1-2.02-.98c.17-.125.336-.256.497-.39 3.797 1.75 7.898 1.75 11.652 0 .163.134.328.265.497.39-.643.383-1.32.71-2.02.98.367.737.797 1.437 1.28 2.098a19.86 19.86 0 0 0 5.993-3.04c.44-4.998-.738-9.337-2.995-13.19ZM8.68 14.81c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.827.926 1.8 2.046 0 1.13-.79 2.045-1.8 2.045Zm6.64 0c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.826.926 1.8 2.046 0 1.13-.78 2.045-1.8 2.045Z" />
      </svg>
    ),
  },
  {
    name: "Instagram",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    name: "X",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
        <path d="M18.244 2H21.5l-7.51 8.59L22.5 22h-6.94l-5.43-7.11L3.8 22H.5l8.04-9.19L1 2h7.06l4.9 6.49L18.244 2Zm-2.44 18h1.92L8.31 4H6.28l9.524 16Z" />
      </svg>
    ),
  },
  {
    name: "Facebook",
    href: "#",
    icon: (
      <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
        <path d="M13.5 21v-7.6h2.55l.4-3h-2.95V8.4c0-.87.24-1.46 1.5-1.46h1.6V4.24C16.24 4.17 15.24 4 14.08 4c-2.6 0-4.38 1.58-4.38 4.5v2.9H6.9v3h2.8V21h3.8Z" />
      </svg>
    ),
  },
];

const CREDITS = ['Denis "Rushador Cuidadoso"', 'Roxana "Rox"', 'Rodrigo "Fate"'];

export default function Footer() {
  const pathname = usePathname();

  if (pathname === "/auth/login") {
    return null;
  }

  return (
    <footer className="flex flex-col gap-10 bg-black px-5 py-10 sm:px-8 lg:px-14">
      <div className="flex flex-wrap items-start gap-9">
        <Image
          src={twpyLogo}
          alt="Tekken Warriors Paraguay"
          width={110}
          className="h-auto w-[110px] flex-shrink-0"
        />
        <div className="flex max-w-[900px] flex-col gap-2.5">
          <h2 className="m-0 font-display text-[22px] tracking-[0.04em] text-primary-500">
            Sobre nosotros:
          </h2>
          <p className="m-0 font-body text-base leading-[1.6] text-white/85">
            Tekken Warriors Paraguay es una comunidad con más de 15 años de trayectoria a
            nivel nacional e internacional. Su objetivo es promover la competencia y el
            compañerismo entre players mediante torneos y encuentros.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-8 border-t border-white/[.08] pt-6">
        <div className="flex flex-col gap-3.5">
          <span className="font-display text-[17px] tracking-[0.06em] text-white/75">
            Síguenos:
          </span>
          <div className="flex gap-3.5">
            {SOCIAL_LINKS.map((social) => (
              <Link
                key={social.name}
                href={social.href}
                aria-label={social.name}
                className="flex h-[42px] w-[42px] items-center justify-center rounded-full bg-white/[.08] text-white transition-all duration-300 hover:-translate-y-[3px] hover:scale-[1.08] hover:bg-primary-500"
              >
                {social.icon}
              </Link>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2 text-right">
          <span className="font-display text-base tracking-[0.04em] text-white/75">
            Creado con 💔 por:
          </span>
          <div className="flex flex-wrap justify-end gap-4 font-body text-sm font-bold text-tekken-blue-400">
            {CREDITS.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
```

- [ ] **Step 2: Run dev server and verify with Playwright**

With `npm run dev` running, navigate to `http://localhost:3000/` and `browser_snapshot` to confirm the footer shows the TWPY logo, "Sobre nosotros" paragraph, 4 social icons, and the 3 credited names. Navigate to `/auth/login` and confirm it does **not** render.

- [ ] **Step 3: Commit**

```bash
git add src/components/footer.js
git commit -m "feat: rebuild Footer on Tekken 8 design tokens, hide on /auth/login"
```

---

### Task 7: Verify Home renders correctly under the new chrome

**Files:** none expected — `src/app/page.js` stays untouched per Global Constraints.

**Interfaces:** none.

- [ ] **Step 1: Run dev server and verify with Playwright**

With `npm run dev` running, navigate to `http://localhost:3000/`. `browser_snapshot` and confirm:
- The Jin/Kazuya hero images, "Bienvenido al Ranking de Tekken Warriors Paraguay" heading, and "Ver Ranking" button are all present and visually unchanged from before this plan.
- The new sticky Navbar renders above the hero and the new Footer renders below it, with no layout overlap or double spacing.
- Resize to a mobile width (e.g. 390×844) and repeat the check.

- [ ] **Step 2: Fix only if a regression is found**

If the hero overlaps the sticky nav or has doubled spacing (the old nav was not sticky — the new one is), the only permitted fix is adjusting the two spacer `<div>`s already in `src/app/page.js` (the `h-16 bg-black` elements) — do not touch the hero's images, headings, or `SeeRankingButton`. If no regression is found, skip this step.

- [ ] **Step 3: Commit (only if Step 2 made a change)**

```bash
git add src/app/page.js
git commit -m "fix: adjust Home spacer bars for the new sticky Navbar"
```

---

### Task 8: Rebuild Ranking page

**Files:**
- Modify: `src/app/ranking/page.js`

**Interfaces:**
- Consumes: `getRankings()` from `../utils/db` (unchanged, returns `[{ posicion, challonge_username, puntaje, movimiento }]`, `movimiento` one of `"SUBE" | "BAJA" | "IGUAL" | "NUEVO"`); `HeroSection`, `RibbonTag` from Task 4.
- Produces: nothing new consumed elsewhere.

- [ ] **Step 1: Replace `src/app/ranking/page.js`**

```jsx
import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

import { getRankings } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

const TREND = {
  SUBE: { icon: "▲", className: "text-success" },
  BAJA: { icon: "▼", className: "text-error" },
  IGUAL: { icon: "=", className: "text-white/40" },
  NUEVO: { icon: "★", className: "text-tekken-blue-400" },
};

function tierBorderClass(posicion) {
  return posicion <= 3 ? "border-l-tekken-blue-400" : "border-l-primary-500";
}

export default async function RankingPage() {
  const rankings = await getRankings();

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>RANKING OFICIAL &middot; TEMPORADA 2025</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              RANKING
            </h1>
            <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
              Tabla de posiciones acumuladas del circuito ranked de Tekken Warriors Paraguay.
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[56px] leading-[.9]">{rankings.length}</span>
            <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
              COMPETIDORES RANKEADOS
            </span>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-16 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-2">
          {rankings.map((ranking, index) => {
            const trend = TREND[ranking.movimiento] ?? TREND.IGUAL;

            return (
              <div
                key={ranking.challonge_username}
                className={`grid grid-cols-[56px_1fr_auto_56px] items-center gap-4 border-l-[3px] px-5 py-3.5 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 ${tierBorderClass(
                  ranking.posicion,
                )} ${index % 2 === 1 ? "bg-white/[.055]" : "bg-white/[.03]"}`}
              >
                <span className="font-display text-2xl text-white/50">{ranking.posicion}</span>
                <span className="truncate font-body text-lg font-semibold">
                  {ranking.challonge_username}
                </span>
                <span className="font-display text-2xl">{ranking.puntaje} pts</span>
                <span className={`text-center font-display text-xl ${trend.className}`}>
                  {trend.icon}
                </span>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Run dev server and verify with Playwright**

With `npm run dev` running, navigate to `http://localhost:3000/ranking`. `browser_snapshot` and confirm: hero renders with the "RANKING" heading and total-count stat, and the row list renders one row per ranked player with position, name, points, and a trend glyph. Confirm the "RANKING" nav link is underlined/glowing (active state).

- [ ] **Step 3: Commit**

```bash
git add src/app/ranking/page.js
git commit -m "feat: rebuild Ranking page on Tekken 8 design tokens"
```

---

### Task 9: Rebuild Competidores page

**Files:**
- Modify: `src/app/competidores/page.js`
- Create: `src/app/competidores/CompetidoresBoard.js`

**Interfaces:**
- Consumes: `getCompetidores()` (returns `[{ challonge_username }]`) and `getRankings()` (returns `[{ posicion, challonge_username, puntaje, movimiento }]`) from `../utils/db`; `HeroSection`, `RibbonTag` from Task 4.
- Produces: `CompetidoresBoard({ roster })` where `roster` is `[{ username: string, posicion: number | null, puntaje: number | null }]` — `page.js` does the server-side merge of the two data calls before handing off to the client component.

- [ ] **Step 1: Replace `src/app/competidores/page.js`**

```jsx
import CompetidoresBoard from "./CompetidoresBoard";
import { getCompetidores, getRankings } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export default async function CompetidoresPage() {
  const [competidores, rankings] = await Promise.all([getCompetidores(), getRankings()]);
  const rankByName = new Map(rankings.map((r) => [r.challonge_username, r]));

  const roster = competidores.map((competidor) => {
    const rank = rankByName.get(competidor.challonge_username);
    return {
      username: competidor.challonge_username,
      posicion: rank?.posicion ?? null,
      puntaje: rank?.puntaje ?? null,
    };
  });

  return <CompetidoresBoard roster={roster} />;
}
```

- [ ] **Step 2: Create `src/app/competidores/CompetidoresBoard.js`**

```jsx
"use client";

import { useMemo, useState } from "react";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";

const FILTERS = [
  { key: "todos", label: "Todos" },
  { key: "rankeados", label: "Rankeados" },
  { key: "sin-puntos", label: "Sin puntos" },
];

export default function CompetidoresBoard({ roster }) {
  const [filter, setFilter] = useState("todos");
  const [query, setQuery] = useState("");
  const [sortByPoints, setSortByPoints] = useState(true);

  const rankedCount = roster.filter((p) => p.posicion !== null).length;

  const podium = useMemo(
    () =>
      roster
        .filter((p) => p.posicion !== null && p.posicion <= 3)
        .sort((a, b) => a.posicion - b.posicion),
    [roster],
  );

  const filtered = useMemo(() => {
    let list = roster;

    if (filter === "rankeados") list = list.filter((p) => p.posicion !== null);
    if (filter === "sin-puntos") list = list.filter((p) => p.posicion === null);

    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter((p) => p.username.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      if (sortByPoints) {
        return (b.puntaje ?? -1) - (a.puntaje ?? -1);
      }
      return a.username.localeCompare(b.username);
    });
  }, [roster, filter, query, sortByPoints]);

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>ROSTER OFICIAL &middot; TEMPORADA 2025</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              COMPETIDORES
            </h1>
          </div>
          <div className="flex items-end gap-7">
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
              <span className="font-display text-[42px] leading-[.9]">{roster.length}</span>
              <span className="font-display text-[13px] tracking-[0.2em] text-white/60">
                TOTAL
              </span>
            </div>
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-tekken-blue-400 pl-4">
              <span className="font-display text-[42px] leading-[.9]">{rankedCount}</span>
              <span className="font-display text-[13px] tracking-[0.2em] text-white/60">
                RANKEADOS
              </span>
            </div>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-16 pt-10 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          {podium.length > 0 && (
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
              {podium.map((player) => (
                <div
                  key={player.username}
                  className="relative overflow-hidden border border-white/10 bg-dark-gray-3-500 p-6"
                >
                  <span className="pointer-events-none absolute -right-2 -top-6 font-display text-[120px] leading-none text-white/[.06]">
                    {player.posicion}
                  </span>
                  <RibbonTag
                    variant={player.posicion === 1 ? "primary" : "cyan"}
                    className="relative mb-3"
                  >
                    {player.posicion === 1 ? "CAMPEÓN VIGENTE" : "N° DEL RANKING"}
                  </RibbonTag>
                  <p className="relative m-0 font-display text-3xl italic">{player.username}</p>
                  <p className="relative m-0 font-body text-sm text-white/60">
                    {player.puntaje} pts
                  </p>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFilter(f.key)}
                  className={`border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
                    filter === f.key
                      ? "border-primary-500 bg-primary-500 text-white"
                      : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar nick..."
                className="h-10 border border-white/15 bg-white/[.04] px-3 font-body text-sm text-white outline-none placeholder:text-white/40 focus:border-primary-500"
              />
              <button
                type="button"
                onClick={() => setSortByPoints((v) => !v)}
                className="flex h-10 items-center gap-2 border border-white/15 bg-white/[.04] px-3 font-display text-sm tracking-[0.08em] text-white/80 hover:border-white/30"
              >
                {sortByPoints ? "MÁS PUNTOS" : "A-Z"} <span>⇅</span>
              </button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center font-body text-white/50">
              No encontramos competidores con ese criterio.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((player) => (
                <div
                  key={player.username}
                  className={`flex flex-col gap-2 border border-white/10 bg-white/[.03] p-4 transition-all duration-300 hover:-translate-y-1 hover:border-primary-500/60 hover:shadow-glow-primary ${
                    player.posicion !== null && player.posicion <= 3
                      ? "border-tekken-blue-400/40"
                      : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        player.posicion === null
                          ? "bg-white/25"
                          : player.posicion <= 3
                            ? "bg-tekken-blue-400"
                            : "bg-primary-500"
                      }`}
                    />
                    <span className="font-display text-sm tracking-[0.08em] text-white/50">
                      {player.posicion !== null ? `#${player.posicion}` : "S/R"}
                    </span>
                  </div>
                  <p className="m-0 truncate font-display text-xl italic">{player.username}</p>
                  <p className="m-0 font-body text-xs text-white/50">
                    {player.puntaje !== null ? `${player.puntaje} pts` : "SIN PUNTOS"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 3: Run dev server and verify with Playwright**

With `npm run dev` running, navigate to `http://localhost:3000/competidores`. `browser_snapshot` and confirm: hero with total/ranked stat counters, a top-3 podium row, filter pills, a search box, a sort toggle, and a card grid. `browser_type` into the search box with a known player's partial name and confirm the grid narrows to matching cards (or shows the empty-state message for a nonsense query). `browser_click` each filter pill and confirm the grid updates.

- [ ] **Step 4: Commit**

```bash
git add src/app/competidores/page.js src/app/competidores/CompetidoresBoard.js
git commit -m "feat: rebuild Competidores page on Tekken 8 design tokens"
```

---

### Task 10: Rebuild Reglamento page

**Files:**
- Modify: `src/app/reglamento/page.js`

**Interfaces:**
- Consumes: `HeroSection`, `RibbonTag`, `Button` from Task 4. No data-layer calls (static content).

- [ ] **Step 1: Replace `src/app/reglamento/page.js`**

```jsx
import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";

const QUICK_FACTS = [
  { label: "FORMATO", value: "ELIMINACIÓN DOBLE", detail: "FT2 en toda la llave" },
  { label: "FINALES", value: "FT3", detail: "Winners, Losers y Grand Finals" },
  { label: "INICIO", value: "15:00 HS", detail: "Puntual, salvo aviso de los organizadores" },
  { label: "BRACKET", value: "CHALLONGE", detail: "Barajado el día del torneo" },
];

const ACCENT_BORDER = {
  primary: "border-primary-500",
  cyan: "border-tekken-blue-400",
};

const SECTIONS = [
  {
    id: "r-formato",
    index: "01",
    title: "FORMATO DE TORNEO",
    accent: "primary",
    rules: [
      {
        n: "01",
        content: (
          <>
            <strong className="text-white">Eliminación doble a FT2.</strong> Winners Finals,
            Losers Finals y Grand Finals se juegan a FT3.
          </>
        ),
      },
    ],
  },
  {
    id: "r-horarios",
    index: "02",
    title: "HORARIOS Y SETUPS",
    accent: "primary",
    rules: [
      {
        n: "02",
        content: (
          <>
            El torneo inicia puntualmente a las <strong className="text-white">15:00 hs</strong>,
            salvo que los organizadores dispongan lo contrario por problemas logísticos u otros
            inconvenientes.
          </>
        ),
      },
      {
        n: "03",
        content: "Los organizadores y ayudantes determinan en qué setup juega cada player.",
      },
    ],
  },
  {
    id: "r-equipamiento",
    index: "03",
    title: "EQUIPAMIENTO",
    accent: "primary",
    rules: [
      {
        n: "04",
        content: (
          <>
            Llevá tu propio control compatible con <strong className="text-white">PS5 o PC</strong>,
            con sus cables USB y adaptadores, o tu propio arcade. Si no tenés control ni arcade,
            coordiná con los demás participantes lo antes posible antes de que inicie el torneo.
          </>
        ),
      },
      {
        n: "05",
        critical: true,
        content: (
          <>
            Cuando un player llega al setup, su contrincante tiene <strong>5 minutos</strong> para
            presentarse y comenzar el FT. Si no llega en ese plazo, o no consigue control o arcade
            para jugar, queda descalificado.
          </>
        ),
      },
    ],
  },
  {
    id: "r-juego",
    index: "04",
    title: "EN LA PARTIDA",
    accent: "cyan",
    rules: [
      {
        n: "06",
        content: (
          <>
            La elección de lado (<strong className="text-white">Player 1 o Player 2</strong>) se
            define de común acuerdo. Si no hay acuerdo, se juega un FT3 de piedra, papel o tijera
            (hakembó).
          </>
        ),
      },
      {
        n: "07",
        content: (
          <>
            Los stages se eligen <strong className="text-white">al azar</strong>. Quien pierde el
            match puede cambiar de personaje si lo considera necesario, pero debe volver a poner
            stage al azar. De lo contrario, los organizadores pueden intervenir y amonestar al
            player por incumplimiento.
          </>
        ),
      },
      {
        n: "08",
        content: (
          <>
            Solo se permiten los <strong className="text-white">costumes por defecto</strong> del
            juego. Está prohibido el uso de costumes personalizados.
          </>
        ),
      },
    ],
  },
  {
    id: "r-conducta",
    index: "05",
    title: "CONDUCTA",
    accent: "primary",
    rules: [
      {
        n: "09",
        content: (
          <>
            Se exige <strong className="text-white">buen comportamiento</strong> durante toda la
            realización de los torneos.
          </>
        ),
      },
    ],
  },
  {
    id: "r-resultados",
    index: "06",
    title: "BRACKET Y RESULTADOS",
    accent: "primary",
    rules: [
      {
        n: "10",
        content: (
          <>
            Los brackets se organizan vía <strong className="text-white">Challonge</strong> y se
            barajan el día del torneo con las personas que abonaron la inscripción.
          </>
        ),
      },
      {
        n: "11",
        content:
          "Al terminar cada FT, acercate a los encargados del Challonge para reportar los resultados de las partidas.",
      },
    ],
  },
];

export default function ReglamentoPage() {
  const totalRules = SECTIONS.reduce((sum, s) => sum + s.rules.length, 0);

  return (
    <>
      <HeroSection className="px-5 pb-6 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-end justify-between gap-8">
          <div className="flex flex-col gap-1.5">
            <RibbonTag>NORMATIVA OFICIAL &middot; TEKKEN 8</RibbonTag>
            <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
              REGLAMENTO
            </h1>
            <p className="m-0 mt-2 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
              Reglas vigentes para todos los torneos ranked del circuito Tekken Warriors
              Paraguay. Inscribirse implica aceptar cada punto de este reglamento.
            </p>
          </div>
          <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
            <span className="font-display text-[56px] leading-[.9]">{totalRules}</span>
            <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
              REGLAS
            </span>
          </div>
        </div>
      </HeroSection>

      <section className="bg-black px-5 pb-24 sm:px-8 lg:px-14">
        <div className="mx-auto max-w-[1240px]">
          <div className="-mt-8 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_FACTS.map((fact) => (
              <div key={fact.label} className="border border-white/10 bg-dark-gray-3-700 p-5">
                <span className="block font-display text-sm tracking-[0.24em] text-white/60">
                  {fact.label}
                </span>
                <span className="mt-1 block font-display text-[34px] leading-none">
                  {fact.value}
                </span>
                <span className="mt-1.5 block font-body text-[13.5px] text-white/60">
                  {fact.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 flex flex-wrap items-start gap-10 lg:flex-nowrap">
            <aside className="sticky top-[100px] hidden flex-none flex-col gap-3.5 lg:flex lg:w-[216px]">
              <span className="font-display text-[15px] tracking-[0.22em] text-white/45">
                ÍNDICE
              </span>
              <div className="flex flex-col gap-0.5">
                {SECTIONS.map((section) => (
                  <a
                    key={section.id}
                    href={`#${section.id}`}
                    className="flex items-baseline gap-2.5 border-l-2 border-white/[.14] px-3 py-2 font-display text-lg tracking-[0.1em] text-white/80 transition-colors duration-300 hover:border-primary-500 hover:bg-primary-500/10 hover:text-white"
                  >
                    <span className="text-xs tracking-[0.14em] text-primary-500">
                      {section.index}
                    </span>
                    {section.title}
                  </a>
                ))}
              </div>
              <Button href="#" className="mt-2.5 self-start px-6 py-2.5 text-[17px] tracking-[0.18em]">
                DISCORD <span>&rarr;</span>
              </Button>
            </aside>

            <div className="flex min-w-0 flex-1 flex-col gap-10">
              {SECTIONS.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-[100px]">
                  <RibbonTag
                    variant={section.accent === "cyan" ? "cyan" : "primary"}
                    className="mb-3.5"
                  >
                    {section.title}
                  </RibbonTag>
                  <div className="flex flex-col gap-0.5">
                    {section.rules.map((rule) => (
                      <div
                        key={rule.n}
                        className={`grid grid-cols-[56px_1fr] items-start gap-4 border-l-[3px] px-5 py-4 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 ${ACCENT_BORDER[section.accent]} ${
                          rule.critical ? "bg-primary-500/10" : "bg-white/[.04]"
                        }`}
                      >
                        <span className="font-display text-4xl leading-[.8] text-white/25">
                          {rule.n}
                        </span>
                        <div className="flex flex-col gap-2.5">
                          {rule.critical && <RibbonTag variant="white">DESCALIFICACIÓN</RibbonTag>}
                          <p className="m-0 font-body text-base leading-[1.62] text-white/90">
                            {rule.content}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
```

- [ ] **Step 2: Run dev server and verify with Playwright**

With `npm run dev` running, navigate to `http://localhost:3000/reglamento`. `browser_snapshot` and confirm: hero with the rule-count stat, 4 quick-fact cards, sticky index on desktop widths (including the "DISCORD →" button at the bottom of the index), all 11 rules across 6 sections, section 4 ("EN LA PARTIDA") using cyan accents, and rule 05 showing the white "DESCALIFICACIÓN" ribbon. `browser_click` an index link and confirm the page scrolls to the matching section.

- [ ] **Step 3: Commit**

```bash
git add src/app/reglamento/page.js
git commit -m "feat: rebuild Reglamento page on Tekken 8 design tokens"
```

---

### Task 11: Rebuild Login page and wire Discord OAuth

**Files:**
- Modify: `src/app/auth/login/page.js`
- Create: `src/app/auth/callback/route.js`

**Interfaces:**
- Consumes: `getSupabaseBrowserClient()` from `src/lib/supabaseClient.js` (unchanged), `createClient()` from `src/lib/supabaseServer.js` (unchanged — same pattern as `src/app/auth/confirm/route.js`), existing `POST /api/auth/login` route (unchanged), `RibbonTag`/`Button` from Task 4.
- Produces: `GET /auth/callback` route that exchanges a Supabase OAuth `code` for a session and redirects to `?next` (defaults to `/`).

**Manual prerequisite (not part of this task, cannot be done via code):** the Discord provider must be enabled in the Supabase project's Auth settings (Dashboard → Authentication → Providers → Discord, with a Discord application's client ID/secret) for the button to complete a real login. Without it, clicking the button still navigates away from the page (Supabase redirects to an error state) rather than crashing — that's what Step 3 below verifies.

- [ ] **Step 1: Replace `src/app/auth/login/page.js`**

```jsx
"use client";

import toast from "react-hot-toast";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabaseClient";
import RibbonTag from "@/components/ui/RibbonTag";
import Button from "@/components/ui/Button";
import twpyLogo from "../../../../public/images/LOGO TWPY/PNG/TWPY LOGO VARIANTES-04.png";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mobile, setMobile] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo");
  const nextPath =
    redirectTo?.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

  useEffect(() => {
    const update = () => setMobile(window.innerWidth < 780);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "No se pudo iniciar sesion");
      }

      toast.success("Has iniciado sesion correctamente.");
      router.push(nextPath);
      router.refresh();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDiscordLogin = async () => {
    const supabase = getSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      toast.error("No se pudo iniciar sesion con Discord");
    }
  };

  return (
    <div
      className="relative flex min-h-screen flex-col overflow-x-clip font-body text-white"
      style={{
        background: "radial-gradient(120% 90% at 15% 0%, #2b0f27 0%, #0c232c 45%, #030f14 100%)",
      }}
    >
      <div className="pointer-events-none absolute inset-0 animate-glow-pulse bg-[radial-gradient(45%_45%_at_82%_78%,rgba(63,209,231,.16)_0%,transparent_70%),radial-gradient(40%_40%_at_12%_20%,rgba(245,10,100,.18)_0%,transparent_70%)]" />

      <nav className="relative z-[2] flex h-[76px] items-center justify-between border-b border-white/[.07] px-5 sm:px-8 lg:px-14">
        <Link href="/" className="flex items-center gap-3 text-white">
          <Image src={twpyLogo} alt="Tekken Warriors Paraguay" height={40} className="h-10 w-auto" />
        </Link>
        <Link
          href="/"
          className="font-display text-lg italic tracking-[0.06em] text-white/70 hover:text-primary-500"
        >
          ← VOLVER AL INICIO
        </Link>
      </nav>

      <main className="relative z-[2] flex flex-1 items-center justify-center px-5 py-12 sm:px-8">
        <div
          className={`grid w-full max-w-[1020px] items-center gap-8 ${
            mobile ? "grid-cols-1" : "grid-cols-[minmax(0,1fr)_minmax(340px,440px)] gap-16"
          }`}
        >
          <div className={`flex flex-col gap-5 ${mobile ? "order-1" : ""}`}>
            <RibbonTag>LIGA TEKKEN PARAGUAY</RibbonTag>
            <h1 className="m-0 font-display text-[clamp(52px,7vw,86px)] italic leading-[.92] tracking-[0.01em]">
              ENTRÁ A LA
              <br />
              <span className="text-primary-500">ARENA</span>
            </h1>
            <p className="m-0 max-w-[420px] font-body text-base leading-[1.65] text-white/70">
              Accedé a tu cuenta para inscribirte a los torneos, seguir tu ranking y ver tus
              próximos combates del fixture.
            </p>
            <div className="flex gap-9 border-t border-white/10 pt-3">
              <div className="flex flex-col">
                <span className="font-display text-[34px] leading-none text-tekken-blue-400">
                  15+
                </span>
                <span className="text-xs uppercase tracking-[0.1em] text-white/55">
                  Años de liga
                </span>
              </div>
              <div className="flex flex-col">
                <span className="font-display text-[34px] leading-none text-tekken-blue-400">
                  32
                </span>
                <span className="text-xs uppercase tracking-[0.1em] text-white/55">
                  Competidores
                </span>
              </div>
            </div>
          </div>

          <div className={`relative ${mobile ? "order-0" : ""}`}>
            <div className="absolute -top-1.5 left-0 right-[14%] h-1.5 bg-primary-500 shadow-glow-primary" />
            <div className="absolute -bottom-1.5 left-[26%] right-0 h-1.5 bg-tekken-blue-400 shadow-glow-cyan" />

            <form
              onSubmit={handleLogin}
              className="flex flex-col gap-5 border border-white/[.07] bg-black p-8 sm:p-10"
            >
              <div className="flex flex-col items-center gap-0.5">
                <span className="font-display text-2xl italic tracking-[0.1em] text-primary-500">
                  TWPY
                </span>
                <h2 className="m-0 font-display text-[54px] italic leading-none">LOGIN</h2>
              </div>

              <label className="flex flex-col gap-2">
                <span className="font-display text-lg italic tracking-[0.05em]">CORREO</span>
                <input
                  id="email"
                  type="email"
                  placeholder="correo@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[50px] w-full border-2 border-transparent bg-[#f1f2f3] px-4 font-body text-[15px] text-[#0a1016] outline-none transition-[border-color,box-shadow] duration-300 focus:border-primary-500 focus:shadow-[0_0_0_4px_rgba(245,10,100,.18)]"
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="font-display text-lg italic tracking-[0.05em]">PASSWORD</span>
                <input
                  id="password"
                  type="password"
                  placeholder="Ingresar password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[50px] w-full border-2 border-transparent bg-[#f1f2f3] px-4 font-body text-[15px] text-[#0a1016] outline-none transition-[border-color,box-shadow] duration-300 focus:border-primary-500 focus:shadow-[0_0_0_4px_rgba(245,10,100,.18)]"
                />
              </label>

              <div className="-mt-1.5 flex items-center justify-between gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[13px] text-white/65">
                  <input type="checkbox" className="h-4 w-4 accent-primary-500" />
                  Recordarme
                </label>
                <Link href="#" className="text-[13px] font-bold text-tekken-blue-400">
                  ¿Olvidaste tu password?
                </Link>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full text-2xl disabled:opacity-60"
              >
                {loading ? "Ingresando..." : "INGRESAR"}
              </Button>

              <div className="flex items-center gap-3 text-[11px] tracking-[0.14em] text-white/30">
                <span className="h-px flex-1 bg-white/[.12]" />O
                <span className="h-px flex-1 bg-white/[.12]" />
              </div>

              <button
                type="button"
                onClick={handleDiscordLogin}
                className="flex h-[50px] items-center justify-center gap-2.5 border border-white/[.16] bg-white/[.04] font-display text-lg tracking-[0.06em] text-white transition-colors duration-300 hover:border-[#5865F2] hover:bg-[#5865F2]/[.16]"
              >
                <svg viewBox="0 0 24 24" width="19" height="19" fill="#5865F2">
                  <path d="M20.317 4.369A19.79 19.79 0 0 0 15.885 3c-.211.375-.457.881-.63 1.283a18.27 18.27 0 0 0-5.51 0A11.5 11.5 0 0 0 9.115 3 19.79 19.79 0 0 0 4.683 4.369C1.61 8.86.79 13.24 1.16 17.56a19.9 19.9 0 0 0 5.993 3.04c.483-.66.913-1.36 1.28-2.098a12.9 12.9 0 0 1-2.02-.98c.17-.125.336-.256.497-.39 3.797 1.75 7.898 1.75 11.652 0 .163.134.328.265.497.39-.643.383-1.32.71-2.02.98.367.737.797 1.437 1.28 2.098a19.86 19.86 0 0 0 5.993-3.04c.44-4.998-.738-9.337-2.995-13.19ZM8.68 14.81c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.827.926 1.8 2.046 0 1.13-.79 2.045-1.8 2.045Zm6.64 0c-.99 0-1.8-.916-1.8-2.045 0-1.13.79-2.046 1.8-2.046 1.02 0 1.826.926 1.8 2.046 0 1.13-.78 2.045-1.8 2.045Z" />
                </svg>
                CONTINUAR CON DISCORD
              </button>

              <p className="m-0 text-center text-sm text-white/60">
                ¿No tenés cuenta?{" "}
                <Link href="/auth/register" className="font-bold italic text-primary-500">
                  Registrate
                </Link>
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create `src/app/auth/callback/route.js`**

```js
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabaseServer";

// Destino del redirect OAuth de Supabase (Discord). Intercambia el `code`
// por una sesion y redirige a `next` (por defecto, home). Distinto de
// /auth/confirm, que verifica el token_hash de los links de email.
export async function GET(request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(new URL(next, origin));
    }
  }

  return NextResponse.redirect(new URL("/error", origin));
}
```

- [ ] **Step 3: Run dev server and verify with Playwright**

With `npm run dev` running, navigate to `http://localhost:3000/auth/login`. `browser_snapshot` and confirm: no shared Navbar/Footer, top bar with logo + "← VOLVER AL INICIO", two-column layout with "ENTRÁ A LA ARENA" heading and the login form. Resize below 780px and confirm the form appears above the text column (stacked, form-first). `browser_click` "CONTINUAR CON DISCORD" and confirm the browser navigates away from `/auth/login` (either to Discord's OAuth consent screen if the provider is configured, or to Supabase's error redirect if it isn't — either is acceptable proof the wiring itself doesn't crash; do not attempt to complete a real Discord login). Then submit the email/password form with an invalid credential and confirm the existing toast-error flow still works.

- [ ] **Step 4: Commit**

```bash
git add src/app/auth/login/page.js src/app/auth/callback/route.js
git commit -m "feat: rebuild Login page on Tekken 8 design tokens, wire Discord OAuth"
```

---

### Task 12: Full-site verification pass

**Files:** none (verification only).

**Interfaces:** none.

- [ ] **Step 1: Build and lint**

Run: `npm run build`
Expected: succeeds with no errors.

Run: `npm run lint`
Expected: no new errors introduced by this plan's changes (pre-existing warnings in untouched files are fine).

- [ ] **Step 2: Playwright walkthrough of every page touched by this plan**

With `npm run dev` running, for each of `/`, `/ranking`, `/competidores`, `/reglamento`, `/auth/login`: navigate, `browser_snapshot`, confirm no console errors via `browser_console_messages`. Check both a desktop viewport (1440×900) and a mobile viewport (390×844) via `browser_resize`.

- [ ] **Step 3: Regression check on out-of-scope pages**

Navigate to `/torneos` and `/auth/register`. Confirm both still render without errors (they keep their old visual style per Global Constraints, but must not be broken by the shared Navbar/Footer/font changes). Check `browser_console_messages` for errors on both.

- [ ] **Step 4: Commit**

Only if Steps 1-3 required fixes elsewhere in the plan's files — commit those fixes with a descriptive message. If no fixes were needed, there is nothing to commit for this task.
