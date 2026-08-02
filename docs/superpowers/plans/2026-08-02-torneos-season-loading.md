# Torneos Year Filter Loading Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give `/torneos`' year filter the same instant-feedback, scoped-loading behavior that `/ranking`'s season selector already has, by extracting the shared transition mechanism and applying it to torneos.

**Architecture:** Extract `SeasonTransitionProvider` (ranking-only today) into a generic `SearchParamTransitionProvider` client context (`useTransition` + `useOptimistic` around `router.push`) at `src/components/ui/`, migrate ranking onto it with no behavior change, then build torneos-specific consumers (`TorneoYearTabs`, `TorneoListBoundary`, `TorneoListLoading`) on top of the same shared hook.

**Tech Stack:** Next.js App Router (React 19 `useOptimistic`/`useTransition`), Tailwind CSS, Playwright (all test tiers — unit/integration/e2e — run through `@playwright/test`, see `playwright.config.js`).

## Global Constraints

- Shared transition module lives at `src/components/ui/SearchParamTransitionProvider.js`, exporting default `SearchParamTransitionProvider({ value, children })` and named `useSearchParamTransition()` returning `{ isPending, navigate(href, nextValue), valorMostrado }`.
- Ranking's behavior and DOM must not change from this refactor — `SeasonTransitionProvider.js` is deleted and its 4 consumers re-point to the shared module, aliasing `valorMostrado` back to `temporadaMostrada` at the destructuring site.
- Torneos' pill filter (`Todos` + year links) keeps its exact current visual styling/classes — only the click/loading *behavior* changes, not the visual design (no ranking-style sliding indicator).
- Filter pills stay `<a href>` elements (not `<button>`), intercepting only a plain left-click (no modifier keys, no non-primary button) so ctrl/cmd/shift/middle-click and "open in new tab" keep working — same rule `SeasonTabs.js` already uses.
- `TorneoListBoundary` does **not** use `<Suspense>` — torneos' list isn't independently async (data is fetched once at the top of `page.js` and filtered in memory), so `isPending` alone is the loading signal.
- Loading label: `` `CARGANDO TEMPORADA ${year}…` `` for a specific year, `"CARGANDO TODOS LOS TORNEOS…"` when the filter is "Todos" (`year === "all"`).
- Loading spinner is scoped to the tournament list only — hero and the "ÚLTIMO TORNEO" featured card are never covered by any loading state (they don't depend on the year filter).
- e2e tests require the local Supabase stack running (`supabase start`) before `npm run test:e2e`, per existing project convention (`playwright.config.js` webServer / `datos` project dependency) — this is a pre-existing requirement, not something this plan sets up.

---

### Task 1: Extract shared `SearchParamTransitionProvider` and migrate ranking onto it

**Files:**
- Create: `src/components/ui/SearchParamTransitionProvider.js`
- Delete: `src/app/ranking/SeasonTransitionProvider.js`
- Modify: `src/app/ranking/page.js`
- Modify: `src/app/ranking/SeasonTabs.js`
- Modify: `src/app/ranking/SeasonRibbon.js`
- Modify: `src/app/ranking/RankingTableBoundary.js`
- Test: `tests/e2e/publico/ranking.spec.js` (existing — no new tests, used as a regression baseline)

**Interfaces:**
- Produces: `SearchParamTransitionProvider({ value, children })` (default export), `useSearchParamTransition()` → `{ isPending: boolean, navigate: (href: string, nextValue: any) => void, valorMostrado: any }`. Task 2 and Task 3 (torneos) consume this exact hook and prop shape.

This is a pure refactor — behavior must stay identical. The test cycle here is "confirm the existing ranking suite passes before and after," not a new failing test.

- [ ] **Step 1: Confirm the local stack is up and the ranking suite currently passes**

Run:
```bash
supabase start
npx playwright test --project=e2e tests/e2e/publico/ranking.spec.js
```
Expected: all `TS-RANK` tests PASS. This is the baseline — if anything fails here, stop and fix the environment before touching code (the refactor must not be blamed for pre-existing failures).

- [ ] **Step 2: Create the shared provider**

Create `src/components/ui/SearchParamTransitionProvider.js`:

```js
"use client";

import { createContext, useContext, useOptimistic, useTransition } from "react";
import { useRouter } from "next/navigation";

// Client-side navigations that only change a searchParam on the same route
// do NOT get progressive Suspense streaming from Next's router -- there's no
// loading.js for these segments, and the router buffers the full RSC
// response before committing anything, inline <Suspense> boundaries
// notwithstanding. This context bridges a trigger component (a tab/pill
// selector) and a scoped loading boundary elsewhere on the page:
//
//   - `isPending`: to show a scoped spinner the moment a click happens,
//     instead of waiting on the router's buffered navigation.
//   - `valorMostrado`: the optimistic value (e.g. the year just clicked).
//     The server takes ~50-100ms to return the new shell, and until then
//     every consumer that displays "what's currently selected" (an eyebrow,
//     a tab indicator, a loading label) would otherwise keep announcing the
//     OLD value -- which reads as "loading the wrong thing" for a beat.
//
// useOptimistic reverts only when the transition ends; by then the base
// value from the server is already the new one, so it never flickers back.
const SearchParamTransitionContext = createContext(null);

export default function SearchParamTransitionProvider({ value, children }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [valorMostrado, setValorOptimista] = useOptimistic(value);

  function navigate(href, nextValue) {
    startTransition(() => {
      setValorOptimista(nextValue);
      // scroll: false -- these are same-page filter changes, not page
      // changes; the default would jump back to the top mid-read.
      router.push(href, { scroll: false });
    });
  }

  return (
    <SearchParamTransitionContext.Provider value={{ isPending, navigate, valorMostrado }}>
      {children}
    </SearchParamTransitionContext.Provider>
  );
}

export function useSearchParamTransition() {
  const ctx = useContext(SearchParamTransitionContext);
  if (!ctx) {
    throw new Error("useSearchParamTransition must be used within a SearchParamTransitionProvider");
  }
  return ctx;
}
```

- [ ] **Step 3: Delete the ranking-local provider**

Delete `src/app/ranking/SeasonTransitionProvider.js`.

- [ ] **Step 4: Re-point ranking's 4 consumers at the shared module**

In `src/app/ranking/page.js`, change:
```js
import SeasonTransitionProvider from "./SeasonTransitionProvider";
```
to:
```js
import SearchParamTransitionProvider from "@/components/ui/SearchParamTransitionProvider";
```
and change both JSX tags:
```jsx
<SeasonTransitionProvider temporada={temporada}>
  ...
</SeasonTransitionProvider>
```
to:
```jsx
<SearchParamTransitionProvider value={temporada}>
  ...
</SearchParamTransitionProvider>
```

In `src/app/ranking/SeasonTabs.js`, change:
```js
import { useSeasonTransition } from "./SeasonTransitionProvider";
```
to:
```js
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";
```
and change:
```js
const { navigate, temporadaMostrada } = useSeasonTransition();
```
to:
```js
const { navigate, valorMostrado: temporadaMostrada } = useSearchParamTransition();
```

In `src/app/ranking/SeasonRibbon.js`, change:
```js
import { useSeasonTransition } from "./SeasonTransitionProvider";
```
to:
```js
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";
```
and change:
```js
const { temporadaMostrada } = useSeasonTransition();
```
to:
```js
const { valorMostrado: temporadaMostrada } = useSearchParamTransition();
```

In `src/app/ranking/RankingTableBoundary.js`, change:
```js
import { useSeasonTransition } from "./SeasonTransitionProvider";
```
to:
```js
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";
```
and change:
```js
const { isPending, temporadaMostrada } = useSeasonTransition();
```
to:
```js
const { isPending, valorMostrado: temporadaMostrada } = useSearchParamTransition();
```

- [ ] **Step 5: Re-run the ranking suite to confirm no regression**

Run:
```bash
npx playwright test --project=e2e tests/e2e/publico/ranking.spec.js
```
Expected: same result as Step 1 — all `TS-RANK` tests PASS, unchanged.

- [ ] **Step 6: Lint**

Run:
```bash
npx eslint src/app/ranking src/components/ui/SearchParamTransitionProvider.js
```
Expected: no errors (in particular, no unused imports left behind in the 4 modified files).

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/SearchParamTransitionProvider.js src/app/ranking/page.js src/app/ranking/SeasonTabs.js src/app/ranking/SeasonRibbon.js src/app/ranking/RankingTableBoundary.js
git rm src/app/ranking/SeasonTransitionProvider.js
git commit -m "refactor(ranking): extract SearchParamTransitionProvider as a shared client transition module"
```

---

### Task 2: Interactive year pills on `/torneos` (instant active-state, no loading yet)

**Files:**
- Create: `src/app/torneos/TorneoYearTabs.js`
- Modify: `src/app/torneos/page.js`
- Test: `tests/e2e/publico/torneos.spec.js`

**Interfaces:**
- Consumes: `SearchParamTransitionProvider` / `useSearchParamTransition` from `@/components/ui/SearchParamTransitionProvider` (Task 1).
- Produces: `TorneoYearTabs({ anos })` (default export, client component) — reads `selectedYear` itself via `useSearchParamTransition().valorMostrado`, so it must be rendered under a `SearchParamTransitionProvider`. Task 3's `TorneoListBoundary` relies on that same provider being present in `page.js`.

- [ ] **Step 1: Write the new e2e test (it will fail — the provider/tabs don't exist yet)**

Append to `tests/e2e/publico/torneos.spec.js`, inside `test.describe("TS-TOR | Torneos publicos", ...)`, after the existing `TC-TOR-006` test:

```js
  /**
   * TC-TOR-007 | El pill de temporada elegido queda activo apenas se hace click,
   *   sin esperar a que la navegacion termine
   * Descripcion: igual que el selector de /ranking, el filtro de temporada usa
   *   estado optimista -- el pill clickeado se marca activo en el frame del
   *   click, no cuando el router finalmente compromete la navegacion. Se frena
   *   la respuesta de red a proposito para poder observar ese hueco: con un
   *   <Link> plano (el codigo actual) la clase activa solo cambia cuando la
   *   navegacion compromete, asi que este test falla contra el codigo viejo y
   *   pasa una vez que el click pasa por `navigate()`.
   * Precondiciones: dos temporadas sembradas.
   * Pasos:
   *   1. Registrar una demora de red para la URL de la temporada anterior
   *      ANTES de navegar (para atrapar tambien el prefetch de <Link>)
   *   2. Ir a /torneos
   *   3. Click en el pill de la temporada anterior
   *   4. Verificar la clase activa dentro de una ventana mas corta que la demora
   * Resultado esperado: el pill queda activo bien dentro de la ventana corta,
   *   sin esperar la respuesta demorada.
   * Tecnica: MBT (transicion de estado) | Prioridad: alta
   */
  test("TC-TOR-007 | el pill elegido queda activo apenas se hace click", async ({ page }) => {
    // Registrado antes de goto() para atrapar tambien el prefetch automatico
    // de <Link> al montar la pagina, no solo el click.
    await page.route(`**/torneos?year=${TEMPORADA_ANTERIOR}`, async (route) => {
      await new Promise((r) => setTimeout(r, 800));
      await route.continue();
    });

    await page.goto("/torneos");

    const pillAnterior = page.locator(`a[href="/torneos?year=${TEMPORADA_ANTERIOR}"]`);
    await pillAnterior.click();

    // La navegacion real tarda >=800ms (por la ruta demorada); si la clase
    // activa aparece dentro de 300ms, vino del estado optimista, no del
    // commit de la navegacion.
    await expect(pillAnterior).toHaveClass(/border-primary-500/, { timeout: 300 });
  });
```

- [ ] **Step 2: Run it and confirm it fails**

Run:
```bash
npx playwright test --project=e2e tests/e2e/publico/torneos.spec.js -g "TC-TOR-007"
```
Expected: FAIL — with today's plain `<Link>` pills, the active class only updates once the (artificially delayed) navigation commits, well past the 300ms assertion window.

- [ ] **Step 3: Create `TorneoYearTabs.js`**

Create `src/app/torneos/TorneoYearTabs.js`:

```js
"use client";

import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

// Mismos pills que antes (Todos + un pill por temporada, mismas clases), pero
// ahora interceptan el click para navegar dentro de una transicion: el pill
// activo se mueve en el frame del click en vez de esperar la navegacion
// bufereada del router (mismo patron que SeasonTabs en /ranking). Se
// mantienen como <a> (no <button>) para que las afordancias del navegador
// (abrir en pestana nueva, click derecho, ctrl/cmd-click) sigan funcionando.
export default function TorneoYearTabs({ anos }) {
  const { navigate, valorMostrado: selectedYear } = useSearchParamTransition();

  function manejarClick(event, href, year) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    navigate(href, year);
  }

  const pillClass = (isActive) =>
    `border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
      isActive
        ? "border-primary-500 bg-primary-500 text-white"
        : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
    }`;

  return (
    <div className="flex flex-wrap animate-fade-up gap-2 [animation-delay:.08s]">
      <a
        href="/torneos"
        onClick={(event) => manejarClick(event, "/torneos", "all")}
        className={pillClass(selectedYear === "all")}
      >
        Todos
      </a>
      {anos.map((year) => {
        const href = `/torneos?year=${year}`;
        return (
          <a
            key={year}
            href={href}
            onClick={(event) => manejarClick(event, href, year)}
            className={pillClass(selectedYear === year)}
          >
            {year}
          </a>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 4: Wire it into `page.js`**

In `src/app/torneos/page.js`, remove the now-unused import:
```js
import Link from "next/link";
```

Add these imports alongside the existing ones:
```js
import SearchParamTransitionProvider from "@/components/ui/SearchParamTransitionProvider";
import TorneoYearTabs from "./TorneoYearTabs";
```

Replace the filter block:
```jsx
          <div className="flex flex-wrap animate-fade-up gap-2 [animation-delay:.08s]">
            <Link
              href="/torneos"
              className={`border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
                selectedYear === "all"
                  ? "border-primary-500 bg-primary-500 text-white"
                  : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
              }`}
            >
              Todos
            </Link>
            {anos.map((year) => (
              <Link
                key={year}
                href={`/torneos?year=${year}`}
                className={`border px-4 py-1.5 font-display text-sm tracking-[0.08em] transition-colors duration-300 ${
                  selectedYear === year
                    ? "border-primary-500 bg-primary-500 text-white"
                    : "border-white/15 bg-white/[.04] text-white/70 hover:border-white/30"
                }`}
              >
                {year}
              </Link>
            ))}
          </div>
```
with:
```jsx
          <TorneoYearTabs anos={anos} />
```

Then wrap the whole content `<section>` (the one starting `<section className="bg-black px-5 pb-16 pt-8 sm:px-8 lg:px-14">`, containing the featured card, the filter, and the list) in the provider — change:
```jsx
      <section className="bg-black px-5 pb-16 pt-8 sm:px-8 lg:px-14">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
```
to:
```jsx
      <SearchParamTransitionProvider value={selectedYear}>
        <section className="bg-black px-5 pb-16 pt-8 sm:px-8 lg:px-14">
          <div className="mx-auto flex max-w-[1240px] flex-col gap-8">
```
and close it — change the matching closing tags at the end of that block:
```jsx
        </div>
      </section>
    </>
  );
}
```
to:
```jsx
          </div>
        </section>
      </SearchParamTransitionProvider>
    </>
  );
}
```
(Re-indent the section's existing inner JSX by one level to stay consistent — content doesn't otherwise change in this step.)

- [ ] **Step 5: Run the new test and confirm it passes**

Run:
```bash
npx playwright test --project=e2e tests/e2e/publico/torneos.spec.js
```
Expected: all `TS-TOR` tests PASS, including the new `TC-TOR-007`.

- [ ] **Step 6: Lint**

Run:
```bash
npx eslint src/app/torneos
```
Expected: no errors (in particular, confirm `next/link`'s `Link` import isn't flagged as unused anywhere else and that `TorneoYearTabs.js` has no unused vars).

- [ ] **Step 7: Commit**

```bash
git add src/app/torneos/TorneoYearTabs.js src/app/torneos/page.js tests/e2e/publico/torneos.spec.js
git commit -m "feat(torneos): make the year filter navigate via optimistic transition"
```

---

### Task 3: Scoped loading spinner for the torneos list

**Files:**
- Create: `src/app/torneos/TorneoListLoading.js`
- Create: `src/app/torneos/TorneoListBoundary.js`
- Modify: `src/app/torneos/page.js`
- Test: `tests/e2e/publico/torneos.spec.js`

**Interfaces:**
- Consumes: `useSearchParamTransition()` from `@/components/ui/SearchParamTransitionProvider` (Task 1); relies on `page.js` rendering `TorneoListBoundary`'s children under the `SearchParamTransitionProvider` added in Task 2, Step 4.
- Produces: `TorneoListLoading({ year })` (default export) — `year` is either a season string or `"all"`. `TorneoListBoundary({ children })` (default export) — renders `TorneoListLoading` while `isPending`, otherwise `children`.

- [ ] **Step 1: Write the new e2e test (it will fail — no spinner exists yet)**

Append to `tests/e2e/publico/torneos.spec.js`, after `TC-TOR-007`:

```js
  /**
   * TC-TOR-008 | El loading de la lista anuncia la temporada elegida y no toca
   *   el hero ni el torneo destacado
   * Descripcion: mismo invariante que TC-RANK-006 en /ranking: durante la
   *   transicion, el spinner scopeado a la lista dice "CARGANDO TEMPORADA
   *   <la elegida>" desde el primer frame, nunca la temporada de partida.
   *   Ademas la tarjeta de "ULTIMO TORNEO" (que no depende del filtro) sigue
   *   visible durante toda la transicion.
   * Precondiciones: dos temporadas sembradas.
   * Pasos:
   *   1. Ir a /torneos
   *   2. Click en el pill de la temporada anterior
   *   3. Muestrear el texto del spinner y la visibilidad del destacado
   *      mientras dura la carga
   * Resultado esperado: todos los textos observados nombran la temporada
   *   elegida; ninguno nombra "TODOS"; el destacado nunca desaparece.
   * Tecnica: MBT (invariante durante la transicion) | Prioridad: alta
   */
  test("TC-TOR-008 | el loading de la lista anuncia la temporada elegida", async ({ page }) => {
    await page.goto("/torneos");
    await expect(page.getByRole("heading", { name: "Torneo E2E Actual" })).toBeVisible();

    const { observados, destacadoSiempreVisible } = await page.evaluate(
      async ({ year }) => {
        const leerSpinner = () => {
          const nodo = [...document.querySelectorAll("span")].find(
            (s) => s.children.length === 0 && s.textContent.trim().startsWith("CARGANDO"),
          );
          return nodo ? nodo.textContent.trim() : null;
        };
        const destacadoVisible = () =>
          [...document.querySelectorAll("h2")].some((h) =>
            h.textContent.includes("Torneo E2E Actual"),
          );

        const textos = new Set();
        let destacadoSiempreVisible = true;
        document.querySelector(`a[href="/torneos?year=${year}"]`).click();

        for (let i = 0; i < 40; i++) {
          const texto = leerSpinner();
          if (texto) textos.add(texto);
          else if (textos.size > 0) break;
          if (!destacadoVisible()) destacadoSiempreVisible = false;
          await new Promise((r) => setTimeout(r, 50));
        }
        return { observados: [...textos], destacadoSiempreVisible };
      },
      { year: TEMPORADA_ANTERIOR },
    );

    expect(observados.length).toBeGreaterThan(0);
    for (const texto of observados) {
      expect(texto).toContain(String(TEMPORADA_ANTERIOR));
      expect(texto).not.toContain("TODOS");
    }
    expect(destacadoSiempreVisible).toBe(true);
  });
```

- [ ] **Step 2: Run it and confirm it fails**

Run:
```bash
npx playwright test --project=e2e tests/e2e/publico/torneos.spec.js -g "TC-TOR-008"
```
Expected: FAIL — `observados.length` is `0` because no spinner exists yet (`expect(observados.length).toBeGreaterThan(0)` fails).

- [ ] **Step 3: Create `TorneoListLoading.js`**

Create `src/app/torneos/TorneoListLoading.js`:

```js
export default function TorneoListLoading({ year }) {
  const label = year === "all" ? "CARGANDO TODOS LOS TORNEOS" : `CARGANDO TEMPORADA ${year}`;

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center gap-4 border border-white/[.08] bg-[rgba(3,10,14,.82)] backdrop-blur-[3px]">
      <div className="relative flex h-14 w-14 items-center justify-center">
        <div className="absolute inset-0 animate-ring-spin rounded-full border-2 border-primary-500/30 border-t-primary-500" />
        <div className="absolute inset-1.5 animate-ring-spin-rev rounded-full border border-dashed border-tekken-blue-400/30" />
      </div>
      <span className="font-display text-sm tracking-[0.22em] text-white/85">
        {label}&hellip;
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Create `TorneoListBoundary.js`**

Create `src/app/torneos/TorneoListBoundary.js`:

```js
"use client";

import TorneoListLoading from "./TorneoListLoading";
import { useSearchParamTransition } from "@/components/ui/SearchParamTransitionProvider";

// A diferencia de RankingTableBoundary, no envuelve en <Suspense>: la lista
// de torneos no hace su propio fetch por temporada (page.js ya trae todos
// los torneos y filtra en memoria), asi que no hay nada que suspender -- el
// unico hueco de carga a cubrir es el de la transicion cliente (isPending).
export default function TorneoListBoundary({ children }) {
  const { isPending, valorMostrado } = useSearchParamTransition();

  return isPending ? <TorneoListLoading year={valorMostrado} /> : children;
}
```

- [ ] **Step 5: Wire it into `page.js`**

In `src/app/torneos/page.js`, add the import:
```js
import TorneoListBoundary from "./TorneoListBoundary";
```

Wrap the list block — change:
```jsx
          <div className="flex flex-col gap-2">
            {filtered.map((torneo, index) => {
              ...
            })}
            {filtered.length === 0 && (
              <p className="py-10 text-center font-body text-white/50">
                No hay torneos para este año.
              </p>
            )}
          </div>
```
to:
```jsx
          <TorneoListBoundary>
            <div className="flex flex-col gap-2">
              {filtered.map((torneo, index) => {
                ...
              })}
              {filtered.length === 0 && (
                <p className="py-10 text-center font-body text-white/50">
                  No hay torneos para este año.
                </p>
              )}
            </div>
          </TorneoListBoundary>
```
(Re-indent the inner `.map` block by one level; its contents are otherwise unchanged.)

- [ ] **Step 6: Run the new test and confirm it passes**

Run:
```bash
npx playwright test --project=e2e tests/e2e/publico/torneos.spec.js
```
Expected: all `TS-TOR` tests PASS, including `TC-TOR-008`.

- [ ] **Step 7: Run the full public e2e suite plus ranking as a final regression check**

Run:
```bash
npx playwright test --project=e2e
```
Expected: all tests PASS (torneos, ranking, competidores, navegacion, reglamento, auth-gate).

- [ ] **Step 8: Lint**

Run:
```bash
npx eslint src/app/torneos
```
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/app/torneos/TorneoListLoading.js src/app/torneos/TorneoListBoundary.js src/app/torneos/page.js tests/e2e/publico/torneos.spec.js
git commit -m "feat(torneos): scope a loading spinner to the tournament list during year-filter transitions"
```

- [ ] **Step 10: Update TODO.todo**

Remove the resolved item from the `PENDIENTE` section of `TODO.todo`:
```
- Seleccion de temporadas en torneos debe tener loading igual al seleccion de temporadas de ranking
```

```bash
git add TODO.todo
git commit -m "chore: mark torneos season-loading TODO as done"
```
