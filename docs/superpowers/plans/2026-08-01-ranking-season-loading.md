# Ranking Top-3 Highlight & Scoped Season-Switch Loading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the public `/ranking` page a magenta-tinted background on top-3 rows and a season-switch loading state scoped to just the results table (not the whole page), matching the Claude Design ranking prototype's intent while staying fully server-rendered (no client-side fetch state).

**Architecture:** Split `src/app/ranking/page.js` into a fast, un-suspended shell (hero, season tabs, ranked-player count) and a slow results table isolated in its own async Server Component wrapped in React `<Suspense>`. A new lightweight `getRankingsCount(temporada)` query (both data backends) feeds the hero counter independently of the heavier, artificially-delayed `getRankings(temporada)` call that feeds the table.

**Tech Stack:** Next.js App Router (Server Components, `Suspense`), Tailwind CSS (existing design tokens only), Supabase JS client (`supabaseDb.js`) / static JSON fixtures (`mockDb.js`), Playwright (`unit`/`integration`/`e2e` projects already configured in `playwright.config.js`).

## Global Constraints

- No new Tailwind keyframes/animations — reuse existing `animate-ring-spin`, `animate-ring-spin-rev`, `animate-card-in`, `animate-fade-up` (all already in `tailwind.config.mjs`).
- No client-side state for the data fetch itself — the season switch must stay `?year=` + `next/link`, server-rendered per request (existing, documented deviation in `design/README.md`).
- Top-3 background must be exactly `rgba(245,10,100,.16)` (Tailwind `bg-primary-500/[.16]`), sourced from the `Ranking Liga Tekken Paraguay - Landscape.dc.html` prototype's `row()` helper.
- `getRankingsCount` must never be wrapped in `withMinDelay` — it exists specifically to resolve faster than the table's artificially-delayed fetch.
- Follow existing test conventions exactly: Playwright `unit` project for pure-function tests (`tests/unit/`), Playwright `unit` project against the local Supabase stack for DB-touching tests (`tests/integration/`, per the comment in `playwright.config.js`), Playwright `e2e` project for full-page checks (`tests/e2e/`). Do not introduce a new test runner or component-testing library.

---

### Task 1: `getRankingsCount(temporada)` in both data backends

**Files:**
- Modify: `src/lib/data/mockDb.js`
- Modify: `src/lib/data/supabaseDb.js`
- Modify: `src/lib/data/index.js`
- Modify: `src/app/utils/db.js`
- Test: `tests/unit/rankingsCount.test.js` (new)
- Test: `tests/integration/rankingsCount.test.js` (new)

**Interfaces:**
- Produces: `getRankingsCount(temporada: string): Promise<number>` — exported from both `mockDb.js` and `supabaseDb.js`, re-exported from `src/lib/data/index.js` and `src/app/utils/db.js` alongside the existing `getTorneos`, `getRankings`, `getCompetidores`, `getFiltroAno`, `getTorneoResultados`. Must equal `(await getRankings(temporada)).length` for the same `temporada`, and return `0` when no tournament exists for that `temporada`.

- [ ] **Step 1: Write the failing unit test (mockDb)**

Create `tests/unit/rankingsCount.test.js`:

```js
import { test, expect } from "@playwright/test";

import { getRankings, getRankingsCount } from "../../src/lib/data/mockDb.js";

test.describe("getRankingsCount (mockDb)", () => {
  test("cuenta los jugadores rankeados de la temporada 2026", async () => {
    const count = await getRankingsCount("2026");
    expect(count).toBe(11);
  });

  test("cuenta los jugadores rankeados de la temporada 2025", async () => {
    const count = await getRankingsCount("2025");
    expect(count).toBe(7);
  });

  test("coincide siempre con getRankings(temporada).length", async () => {
    const rankings = await getRankings("2026");
    const count = await getRankingsCount("2026");
    expect(count).toBe(rankings.length);
  });

  test("devuelve 0 para una temporada sin torneos", async () => {
    const count = await getRankingsCount("1999");
    expect(count).toBe(0);
  });
});
```

The expected counts (11 for `"2026"`, 7 for `"2025"`) come from the fixture
data in `src/torneos.json` / `src/resultado.json`: 5 tournaments dated
2026 (`torneos.json` ids `1`-`5`) have 11 unique competitor ids across
`resultado.json`; 2 tournaments dated 2025 (ids `6`-`7`) have 7 unique
competitor ids.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test tests/unit/rankingsCount.test.js --project=unit`
Expected: FAIL — `getRankingsCount` is not exported from `mockDb.js`.

- [ ] **Step 3: Implement `getRankingsCount` in `mockDb.js`**

In `src/lib/data/mockDb.js`, add after the existing `getRankings` function
(after line 106, before `getFiltroAno`):

```js
const getRankingsCount = async (temporada) => {
  const rankings = await getRankings(temporada);
  return rankings.length;
};
```

Add `getRankingsCount` to the `export { ... }` block at the bottom of the
file (alongside `getTorneos, getRankings, getCompetidores, getFiltroAno,
getTorneoResultados`).

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test tests/unit/rankingsCount.test.js --project=unit`
Expected: PASS (4 tests)

- [ ] **Step 5: Write the failing integration test (supabaseDb)**

Create `tests/integration/rankingsCount.test.js`:

```js
// Contra el stack local de Supabase (`supabase start`). Nunca corre contra
// el proyecto remoto -- ver tests/testSupabase.js.
//
// getRankings/getRankingsCount (supabaseDb.js) arman su propio cliente
// interno desde NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (a
// diferencia de puntajes.js, no reciben el cliente como parametro), asi
// que esas vars se fijan en beforeAll, antes de la primera llamada.
import { test, expect } from "@playwright/test";

import {
  getServiceClient,
  LOCAL_SUPABASE_URL,
  LOCAL_SUPABASE_ANON_KEY,
} from "../testSupabase.js";
import {
  getRankings,
  getRankingsCount,
} from "../../src/lib/data/supabaseDb.js";

const TORNEO_ID = 995002;
const TEMPORADA = 9095;

test.describe("getRankingsCount (supabaseDb)", () => {
  let playerIds = [];

  test.beforeAll(async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL =
      process.env.SUPABASE_URL || LOCAL_SUPABASE_URL;
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY =
      process.env.SUPABASE_ANON_KEY || LOCAL_SUPABASE_ANON_KEY;

    const supabase = getServiceClient();

    const { data: juego } = await supabase
      .from("juegos")
      .select("id")
      .ilike("nombre", "Tekken 8")
      .maybeSingle();

    await supabase.from("torneos").insert({
      id: TORNEO_ID,
      nombre: "Torneo Count E2E",
      fecha_inicio: "2095-01-01",
      temporada: TEMPORADA,
      juego_id: juego.id,
    });

    for (const nombre of ["Count E2E Uno", "Count E2E Dos"]) {
      const { data: player } = await supabase
        .from("players")
        .insert({ display_name: nombre })
        .select("id")
        .single();
      playerIds.push(player.id);
    }

    await supabase.from("ranking_snapshots").insert([
      {
        torneo_id: TORNEO_ID,
        player_id: playerIds[0],
        temporada: TEMPORADA,
        puntaje_acumulado: 100,
        posicion_global: 1,
      },
      {
        torneo_id: TORNEO_ID,
        player_id: playerIds[1],
        temporada: TEMPORADA,
        puntaje_acumulado: 50,
        posicion_global: 2,
      },
    ]);
  });

  test.afterAll(async () => {
    const supabase = getServiceClient();
    await supabase.from("torneos").delete().eq("id", TORNEO_ID);
    for (const id of playerIds) {
      await supabase.from("players").delete().eq("id", id);
    }
  });

  test("cuenta los jugadores rankeados sembrados", async () => {
    const count = await getRankingsCount(String(TEMPORADA));
    expect(count).toBe(2);
  });

  test("coincide con getRankings(temporada).length", async () => {
    const rankings = await getRankings(String(TEMPORADA));
    const count = await getRankingsCount(String(TEMPORADA));
    expect(count).toBe(rankings.length);
  });

  test("devuelve 0 para una temporada sin torneos", async () => {
    const count = await getRankingsCount("8888");
    expect(count).toBe(0);
  });
});
```

- [ ] **Step 6: Run it to verify it fails**

Prerequisite: local Supabase stack running (`supabase start`).

Run: `npx playwright test tests/integration/rankingsCount.test.js --project=unit`
Expected: FAIL — `getRankingsCount` is not exported from `supabaseDb.js`.

- [ ] **Step 7: Implement `getRankingsCount` in `supabaseDb.js`**

In `src/lib/data/supabaseDb.js`, add after the existing `getRankings`
function (after line 156, before `getFiltroAno`):

```js
const getRankingsCount = async (temporada) => {
  const supabase = getClient();

  let torneosQuery = supabase
    .from("torneos")
    .select("id, temporada")
    .order("temporada", { ascending: false })
    .order("fecha_inicio", { ascending: false });

  if (temporada) {
    torneosQuery = torneosQuery.eq("temporada", temporada);
  }

  const { data: ultimosTorneos, error: torneosError } =
    await torneosQuery.limit(1);

  if (torneosError) {
    throw new Error(`Error al obtener torneos: ${torneosError.message}`);
  }

  if (!ultimosTorneos || ultimosTorneos.length === 0) {
    return 0;
  }

  const { count, error: countError } = await supabase
    .from("ranking_snapshots")
    .select("player_id", { count: "exact", head: true })
    .eq("torneo_id", ultimosTorneos[0].id);

  if (countError) {
    throw new Error(`Error al contar ranking: ${countError.message}`);
  }

  return count ?? 0;
};
```

Add `getRankingsCount` to the `export { ... }` block at the bottom of the
file (alongside the other four functions).

- [ ] **Step 8: Run it to verify it passes**

Run: `npx playwright test tests/integration/rankingsCount.test.js --project=unit`
Expected: PASS (3 tests)

- [ ] **Step 9: Wire re-exports**

In `src/lib/data/index.js`, add `getRankingsCount` to the destructured
export:

```js
export const {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
  getRankingsCount,
} = db;
```

In `src/app/utils/db.js`, add `getRankingsCount` to the re-export list:

```js
export {
  getTorneos,
  getRankings,
  getCompetidores,
  getFiltroAno,
  getTorneoResultados,
  getRankingsCount,
} from "@/lib/data";
```

- [ ] **Step 10: Run the full unit project to confirm nothing else broke**

Run: `npx playwright test --project=unit`
Expected: PASS (all existing + 7 new tests)

- [ ] **Step 11: Commit**

```bash
git add src/lib/data/mockDb.js src/lib/data/supabaseDb.js src/lib/data/index.js src/app/utils/db.js tests/unit/rankingsCount.test.js tests/integration/rankingsCount.test.js
git commit -m "feat(ranking): add getRankingsCount, decoupled from the full rankings fetch"
```

---

### Task 2: Scoped Suspense loading + top-3 background in `/ranking`

**Files:**
- Create: `src/app/ranking/RankingTable.js`
- Create: `src/app/ranking/RankingTableLoading.js`
- Create: `src/components/ui/AnimatedCount.js`
- Modify: `src/app/ranking/page.js`
- Test: `tests/e2e/public-pages.spec.js:72-75` (extend existing `/ranking` test)

**Interfaces:**
- Consumes: `getRankingsCount(temporada)`, `getRankings(temporada)`, `getFiltroAno()` from `src/app/utils/db.js` (Task 1). `withMinDelay(promise, ms?)` from `src/lib/withMinDelay.js`. `fadeDelay(index)` from `src/lib/fadeDelay.js`. `TREND` from `@/lib/data/movimiento`. `HeroSection`, `RibbonTag` from `src/components/ui/`. `SeasonTabs` from `src/app/ranking/SeasonTabs.js` (unchanged).
- Produces: `<RankingTable temporada={string} />` (default export, async Server Component). `<RankingTableLoading temporada={string} />` (default export). `<AnimatedCount value={number} />` (default export, client component).

- [ ] **Step 1: Write the failing e2e assertions**

In `tests/e2e/public-pages.spec.js`, replace the existing `/ranking` test
(currently lines 72-75) with:

```js
  test("/ranking carga y muestra el jugador sembrado", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByText("Jugador E2E")).toBeVisible();

    // Posicion 1 (top-3) debe tener el fondo magenta del diseno, no el
    // zebra-stripe generico.
    const row = page.getByText("Jugador E2E").locator("xpath=..");
    await expect(row).toHaveCSS("background-color", "rgba(245, 10, 100, 0.16)");

    // El contador del hero refleja el conteo rapido (getRankingsCount),
    // no el largo de la tabla con join.
    const counter = page
      .getByText("COMPETIDORES RANKEADOS")
      .locator("xpath=preceding-sibling::span[1]");
    await expect(counter).toHaveText("1");
  });
```

- [ ] **Step 2: Run it to verify it fails**

Prerequisite: local Supabase stack running (`supabase start`).

Run: `npx playwright test tests/e2e/public-pages.spec.js -g "ranking carga" --project=e2e`
Expected: FAIL — no element currently has `background-color:
rgba(245, 10, 100, 0.16)` (top-3 rows share the same zebra-stripe as
every other row today).

- [ ] **Step 3: Create `AnimatedCount.js`**

Create `src/components/ui/AnimatedCount.js`:

```jsx
"use client";

// Remounting the inner span on every `value` change (via `key`) re-plays
// the existing `card-in` keyframe instead of snapping straight to the new
// number -- no manual useState/useEffect diffing needed.
export default function AnimatedCount({ value }) {
  return (
    <span key={value} className="inline-block animate-card-in">
      {value}
    </span>
  );
}
```

- [ ] **Step 4: Create `RankingTableLoading.js`**

Create `src/app/ranking/RankingTableLoading.js`:

```jsx
export default function RankingTableLoading({ temporada }) {
  return (
    <section className="bg-black px-4 pb-16 pt-8 sm:px-8 lg:px-14">
      <div className="mx-auto flex min-h-[420px] max-w-[1240px] flex-col items-center justify-center gap-4 border border-white/[.08] bg-[rgba(3,10,14,.82)] backdrop-blur-[3px]">
        <div className="relative flex h-14 w-14 items-center justify-center">
          <div className="absolute inset-0 animate-ring-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
          <div className="absolute inset-1.5 animate-ring-spin-rev rounded-full border border-dashed border-tekken-blue-400/30" />
        </div>
        <span className="font-display text-sm tracking-[0.22em] text-white/85">
          CARGANDO TEMPORADA {temporada}&hellip;
        </span>
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Create `RankingTable.js`**

Create `src/app/ranking/RankingTable.js` (rows markup moved out of
`page.js`, plus the new top-3 background):

```jsx
import { getRankings } from "../utils/db";
import { withMinDelay } from "@/lib/withMinDelay";
import { fadeDelay } from "@/lib/fadeDelay";
import { TREND } from "@/lib/data/movimiento";

function tierBorderClass(posicion) {
  return posicion <= 3 ? "border-l-tekken-blue-400" : "border-l-primary-500";
}

function tierBackgroundClass(posicion, index) {
  if (posicion <= 3) return "bg-primary-500/[.16]";
  return index % 2 === 1 ? "bg-white/[.055]" : "bg-white/[.03]";
}

export default async function RankingTable({ temporada }) {
  const rankings = await withMinDelay(getRankings(temporada));

  return (
    <section className="bg-black px-4 pb-16 pt-8 sm:px-8 lg:px-14">
      <div className="mx-auto max-w-[1240px] lg:columns-2 lg:gap-x-8">
        {rankings.map((ranking, index) => {
          const trend = TREND[ranking.movimiento] ?? TREND.IGUAL;

          return (
            <div
              key={ranking.posicion}
              style={fadeDelay(index)}
              className={`mb-2 grid w-full animate-fade-up grid-cols-[28px_minmax(0,1fr)_auto_22px] items-center gap-2 break-inside-avoid border-l-[3px] px-3 py-2.5 transition-all duration-300 hover:translate-x-1.5 hover:bg-primary-500/10 sm:grid-cols-[56px_minmax(0,1fr)_auto_56px] sm:gap-4 sm:px-5 sm:py-3.5 ${tierBorderClass(
                ranking.posicion,
              )} ${tierBackgroundClass(ranking.posicion, index)}`}
            >
              <span className="font-display text-base text-white/50 sm:text-2xl">
                {ranking.posicion}
              </span>
              <span className="[overflow-wrap:anywhere] font-body text-sm font-semibold sm:text-lg">
                {ranking.nombre}
              </span>
              <span className="whitespace-nowrap font-display text-base sm:text-2xl">
                {ranking.puntaje} pts
              </span>
              <span
                className={`text-center font-display text-base sm:text-xl ${trend.className}`}
              >
                {trend.icon}
              </span>
            </div>
          );
        })}
        {rankings.length === 0 && (
          <p className="py-10 text-center font-body text-white/50">
            No hay rankings todavía para esta temporada.
          </p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Rewrite `page.js`**

Replace `src/app/ranking/page.js` entirely with:

```jsx
import { Suspense } from "react";

import HeroSection from "@/components/ui/HeroSection";
import RibbonTag from "@/components/ui/RibbonTag";
import AnimatedCount from "@/components/ui/AnimatedCount";
import SeasonTabs from "./SeasonTabs";
import RankingTable from "./RankingTable";
import RankingTableLoading from "./RankingTableLoading";

import { getFiltroAno, getRankingsCount } from "../utils/db";

// Revalida cada 60s para reflejar torneos nuevos sin redeploy
// (y cachea las consultas a la BD).
export const revalidate = 60;

export const metadata = {
  title: "Ranking",
  description: "Tabla de posiciones de la temporada actual del circuito ranked de Tekken Warriors Paraguay.",
};

export default async function RankingPage({ searchParams }) {
  const params = await searchParams;

  const anos = await getFiltroAno();
  const requestedYear = params?.year;
  const temporada =
    requestedYear && anos.includes(requestedYear)
      ? requestedYear
      : (anos[0] ?? String(new Date().getFullYear()));
  const count = await getRankingsCount(temporada);

  const seasons = anos.map((year) => ({
    year,
    status: year === anos[0] ? "EN CURSO" : "FINALIZADA",
    isDefault: year === anos[0],
  }));

  return (
    <>
      <HeroSection className="px-5 pb-11 pt-11 sm:px-8 sm:pt-16 lg:px-14 lg:pt-[84px]">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-6">
          <div className="flex flex-wrap items-end justify-between gap-8">
            <div className="flex flex-col gap-1.5">
              <RibbonTag>{`RANKING OFICIAL · TEMPORADA ${temporada}`}</RibbonTag>
              <h1 className="-ml-1.5 m-0 font-display text-[clamp(58px,8.4vw,116px)] italic leading-[.88] tracking-[0.01em] [text-shadow:0_0_34px_rgba(230,0,0,.65),0_0_90px_rgba(245,10,100,.38)]">
                RANKING
              </h1>
              <p className="m-0 max-w-[600px] font-body text-base leading-[1.6] text-white/70">
                Tabla de posiciones acumuladas de la temporada actual del circuito ranked de Tekken Warriors Paraguay.
              </p>
            </div>
            <div className="flex flex-col items-start gap-0.5 border-l-[3px] border-primary-500 pl-4">
              <span className="font-display text-[56px] leading-[.9]">
                <AnimatedCount value={count} />
              </span>
              <span className="font-display text-[15px] tracking-[0.22em] text-white/60">
                COMPETIDORES RANKEADOS
              </span>
            </div>
          </div>
          {seasons.length > 1 && (
            <SeasonTabs seasons={seasons} activeYear={temporada} />
          )}
        </div>
      </HeroSection>

      <Suspense fallback={<RankingTableLoading temporada={temporada} />}>
        <RankingTable temporada={temporada} />
      </Suspense>
    </>
  );
}
```

- [ ] **Step 7: Run the e2e test to verify it passes**

Run: `npx playwright test tests/e2e/public-pages.spec.js -g "ranking carga" --project=e2e`
Expected: PASS

- [ ] **Step 8: Run the full e2e project to confirm no regressions**

Run: `npx playwright test --project=e2e`
Expected: PASS (all existing public-page and admin-gate tests, including
`/torneos`, `/competidores`, `/torneo-resultado/[id]`)

- [ ] **Step 9: Manual verification of the scoped loading visual**

Automated tests only check steady-state DOM — the transient loading
overlay needs a human look, same approach used for the root
`PageLoadingRing` (see
`docs/superpowers/specs/2026-07-29-page-loading-ring-transition-design.md`,
Testing section):

1. In `src/app/ranking/RankingTable.js`, temporarily bump
   `withMinDelay(getRankings(temporada))` to
   `withMinDelay(getRankings(temporada), 4000)` so the loading state is
   easy to see.
2. `npm run dev` (with `DATA_SOURCE=supabase` or the mock default) and
   open `/ranking` with at least two seasons of data.
3. Click a different season tab. Confirm: hero title/eyebrow, the
   "COMPETIDORES RANKEADOS" counter (with its short fade/flip animation),
   and the season tabs update immediately; only the results-table region
   shows the dark scrim + dual-ring spinner + "CARGANDO TEMPORADA
   {año}…" label; rows fade in (`animate-fade-up`) once loaded.
4. If a season with zero ranked players exists in your data, switch to it
   and confirm `RankingTable` still renders "No hay rankings todavía para
   esta temporada." (unchanged code path, moved as-is from the old
   `page.js`) instead of an empty/broken table.
5. Revert the temporary 4000ms delay back to the default (no second
   argument) before committing.

- [ ] **Step 10: Commit**

```bash
git add src/app/ranking/RankingTable.js src/app/ranking/RankingTableLoading.js src/components/ui/AnimatedCount.js src/app/ranking/page.js tests/e2e/public-pages.spec.js
git commit -m "feat(ranking): scope season-switch loading to the table, highlight top-3 rows"
```
