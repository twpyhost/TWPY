# Desempate: panel fuera de la tabla + feedback de movimiento — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In `/admin/liga/grupo/[numero]`, move the "Confirmar"/"Descartar" tie-break buttons out of the live standings table into a panel below it, and add a brief color-flash on the two rows that swap position when an admin clicks ↑/↓.

**Architecture:** Both changes live entirely in the single client component `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js` — no API, schema, or business-logic changes. Task 1 relocates existing JSX and existing handlers (`confirmarBloque`, `descartarBloque`, `hayCambiosPendientes`) into a new panel computed from the same `bloques`/`filasVisibles` data already in the component. Task 2 adds a small `Set`-based "recently moved" state, driven by `setTimeout`, that toggles a temporary background class on the two affected `<tr>` elements.

**Tech Stack:** Next.js App Router client component (`"use client"`), React state/hooks, Tailwind CSS transitions (no animation library).

## Global Constraints

- No changes to `PUT /api/admin/liga/grupos/[numero]/desempate`, `PUT /api/admin/liga/grupos/[numero]/cerrar`, `calcularTabla`, `bloquesPorPuntos`, `estadoParaPosicion`, `ordenDraft`, `hayCambiosPendientes`, `confirmarBloque`, `descartarBloque`, or any close/reopen validation — this work is presentation-only.
- The ↑/↓ arrows stay exactly where they are today, inside the table's "Desempate" column.
- No new dependency/animation library — the move feedback is a CSS `transition-colors` toggle driven by component state, not a positional (FLIP) animation.
- The "Confirmar"/"Descartar" panel only renders rows for blocks that actually need action: a block needs a row when its first visible row has `empatado: true`, OR `hayCambiosPendientes(bloque)` is `true`. "Descartar" only renders within a block's row when `hayCambiosPendientes(bloque)` is `true`. If no block needs action, the whole panel is absent from the DOM (not an empty container).

---

### Task 1: Move Confirmar/Descartar into a panel below the table

**Files:**
- Modify: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`
- Test: `tests/e2e/admin/ligaDesempate.spec.js`

**Interfaces:**
- Consumes (already exist in this file, unchanged): `bloques` (`useMemo`, array of `{ inicio, fin }`), `filasVisibles` (`useMemo`, array of table row objects with `.participanteId`, `.nombre`, `.empatado`), `claveBloque(tabla, bloque) -> string`, `hayCambiosPendientes(bloque) -> boolean`, `confirmarBloque(bloque)`, `descartarBloque(bloque)`, `bloquesGuardando` (`Set<string>` of block keys currently saving).
- Produces: a new derived value `bloquesPendientes` (plain `const`, an array of `bloque` objects — a subset of `bloques`) computed in the component body, consumed only by this task's own new panel JSX (no other task depends on it).

- [ ] **Step 1: Write the failing e2e test**

Open `tests/e2e/admin/ligaDesempate.spec.js` and replace the entire body of the existing `TC-LIGA-DESEMPATE-005` test (currently just clicks "Confirmar" and checks the toast) with:

```js
  test("TC-LIGA-DESEMPATE-005 | confirmar un bloque empatado sin mover ninguna fila", async ({
    page,
  }) => {
    await page.goto("/admin/liga/grupo/5");

    await expect(page.getByText("DESEMPATES PENDIENTES")).toBeVisible();
    await expect(page.locator("table").getByRole("button", { name: "Confirmar" })).toHaveCount(0);

    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Desempate guardado")).toBeVisible();

    await expect(page.getByText("DESEMPATES PENDIENTES")).not.toBeVisible();
  });
```

This asserts three things the current code doesn't do yet: a "DESEMPATES PENDIENTES" panel heading exists outside the table, the "Confirmar" button is NOT inside the `<table>` element, and the whole panel disappears once nothing is pending.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-005"`
Expected: FAIL — there is no "DESEMPATES PENDIENTES" text anywhere yet.

- [ ] **Step 3: Add `bloquesPendientes` and the panel; remove the in-table Confirmar/Descartar**

In `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`, find the `hayCambiosPendientes` function (it currently sits between `moverEnDraft` and `confirmarBloque`):

```js
  const hayCambiosPendientes = (bloque) => {
    const clave = claveBloque(grupo.tabla, bloque);
    const draft = ordenDraft[clave];
    if (!draft) return false;
    const servidor = ordenServidorBloque(grupo.tabla, bloque);
    return draft.some((id, i) => id !== servidor[i]);
  };
```

Right after it (still before `confirmarBloque`), add:

```js

  const bloquesPendientes = bloques.filter((bloque) => {
    const primeraFila = filasVisibles[bloque.inicio];
    return (primeraFila?.empatado ?? false) || hayCambiosPendientes(bloque);
  });
```

Now find the desempate `<td>` inside the table body (inside `filasVisibles.map((fila, indice) => { ... })`). It currently looks like this — locate the second block (the one with the immediately-invoked function that renders Confirmar/Descartar):

```jsx
                          {bloque &&
                            indice === bloque.fin - 1 &&
                            (() => {
                              const bloqueSinResolver = fila.empatado;
                              const hayCambios = hayCambiosPendientes(bloque);
                              if (!bloqueSinResolver && !hayCambios) return null;
                              return (
                                <div className="mt-1 inline-flex gap-1">
                                  <button
                                    type="button"
                                    disabled={bloquesGuardando.has(
                                      claveBloque(grupo.tabla, bloque),
                                    )}
                                    onClick={() => confirmarBloque(bloque)}
                                    className="border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-bold text-success disabled:opacity-40"
                                  >
                                    Confirmar
                                  </button>
                                  {hayCambios && (
                                    <button
                                      type="button"
                                      disabled={bloquesGuardando.has(
                                        claveBloque(grupo.tabla, bloque),
                                      )}
                                      onClick={() => descartarBloque(bloque)}
                                      className="border border-white/20 bg-white/[.04] px-2 py-1 text-[11px] text-white/70 disabled:opacity-40"
                                    >
                                      Descartar
                                    </button>
                                  )}
                                </div>
                              );
                            })()}
```

Delete that entire block. The desempate `<td>` should now contain only the `{bloque && (<div className="inline-flex gap-1">...arrows...</div>)}` part — nothing else.

Just after the table's closing `</div>` (the `overflow-x-auto` wrapper) and the `<p className="font-body text-xs text-white/50">Clasifican los primeros...</p>` paragraph that follows it, still inside the same `<div className="flex flex-col gap-3">` column, add the new panel:

```jsx
            {bloquesPendientes.length > 0 && (
              <div className="flex flex-col gap-2 border border-white/10 bg-white/[.03] p-4">
                <span className="font-display text-sm tracking-[0.08em] text-white/60">
                  DESEMPATES PENDIENTES
                </span>
                {bloquesPendientes.map((bloque) => {
                  const nombres = filasVisibles
                    .slice(bloque.inicio, bloque.fin)
                    .map((f) => f.nombre)
                    .join(", ");
                  const clave = claveBloque(grupo.tabla, bloque);
                  const guardando = bloquesGuardando.has(clave);
                  const hayCambios = hayCambiosPendientes(bloque);
                  return (
                    <div
                      key={clave}
                      className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[.06] pt-2 first:border-t-0 first:pt-0"
                    >
                      <span className="font-body text-sm text-white/80">
                        Puestos {bloque.inicio + 1}–{bloque.fin}: {nombres}
                      </span>
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          disabled={guardando}
                          onClick={() => confirmarBloque(bloque)}
                          className="border border-success/40 bg-success/10 px-3 py-1.5 text-xs font-bold text-success disabled:opacity-40"
                        >
                          Confirmar
                        </button>
                        {hayCambios && (
                          <button
                            type="button"
                            disabled={guardando}
                            onClick={() => descartarBloque(bloque)}
                            className="border border-white/20 bg-white/[.04] px-3 py-1.5 text-xs text-white/70 disabled:opacity-40"
                          >
                            Descartar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
```

Double-check the exact placement: this new block goes between the closing `</p>` of the "Clasifican los primeros..." paragraph and the closing `</div>` of the `flex flex-col gap-3` column that contains the `RibbonTag`, the table, and that paragraph — NOT inside the `FECHAS` column on the right.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-005"`
Expected: PASS.

- [ ] **Step 5: Run the full ligaDesempate + liga e2e suites to check for regressions**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/liga.spec.js tests/e2e/admin/ligaDesempate.spec.js`
Expected: PASS — all tests, including `TC-LIGA-DESEMPATE-003` and `-004`, which also click "Confirmar" (already selected without scoping to a table row, so relocating the button doesn't break them).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/liga/grupo/\[numero\]/GrupoDetalle.js tests/e2e/admin/ligaDesempate.spec.js
git commit -m "feat(liga): mover Confirmar/Descartar del desempate a un panel debajo de la tabla"
```

---

### Task 2: Flash the two rows that swap position on ↑/↓

**Files:**
- Modify: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`

**Interfaces:**
- Consumes: `moverEnDraft(bloque, indiceEnBloque, direccion)` (existing, modified in place by this task — same name and call sites, no signature change for callers).
- Produces: no new exports; a new internal `destacarFilas(ids: number[])` helper used only within this file.

This task has no dedicated automated test (per the design spec: a timed CSS transition isn't worth asserting on in e2e without making the test fragile). Verification is: the existing e2e suite still passes (arrows are clicked in several existing tests, so this exercises the new code path without crashing), plus a manual check in the browser.

- [ ] **Step 1: Add the `destacados` state and the `useRef` import**

In `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`, change the React import line:

```js
import { useCallback, useEffect, useMemo, useState } from "react";
```

to:

```js
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
```

In the component body, right after the existing `const [bloquesGuardando, setBloquesGuardando] = useState(new Set());` line, add:

```js
  const [destacados, setDestacados] = useState(new Set());
  const destacadosTimeouts = useRef(new Map());
```

- [ ] **Step 2: Clear pending timeouts on unmount**

Right after the existing mount effect:

```js
  useEffect(() => {
    cargar();
  }, [cargar]);
```

add a second effect:

```js

  useEffect(() => {
    return () => {
      for (const timeoutId of destacadosTimeouts.current.values()) {
        clearTimeout(timeoutId);
      }
    };
  }, []);
```

- [ ] **Step 3: Add `destacarFilas` and wire it into `moverEnDraft`**

Find the existing `moverEnDraft` function:

```js
  const moverEnDraft = (bloque, indiceEnBloque, direccion) => {
    const clave = claveBloque(grupo.tabla, bloque);
    const actual = ordenDraft[clave] ?? ordenServidorBloque(grupo.tabla, bloque);
    const posLocal = indiceEnBloque - bloque.inicio;
    const otroLocal = posLocal + direccion;
    if (otroLocal < 0 || otroLocal >= actual.length) return;

    const nuevo = [...actual];
    [nuevo[posLocal], nuevo[otroLocal]] = [nuevo[otroLocal], nuevo[posLocal]];
    setOrdenDraft((prev) => ({ ...prev, [clave]: nuevo }));
  };
```

Replace it with:

```js
  const destacarFilas = (ids) => {
    for (const id of ids) {
      const timeoutPrevio = destacadosTimeouts.current.get(id);
      if (timeoutPrevio) clearTimeout(timeoutPrevio);
    }
    setDestacados((prev) => {
      const siguiente = new Set(prev);
      for (const id of ids) siguiente.add(id);
      return siguiente;
    });
    for (const id of ids) {
      const timeoutId = setTimeout(() => {
        setDestacados((prev) => {
          const siguiente = new Set(prev);
          siguiente.delete(id);
          return siguiente;
        });
        destacadosTimeouts.current.delete(id);
      }, 500);
      destacadosTimeouts.current.set(id, timeoutId);
    }
  };

  const moverEnDraft = (bloque, indiceEnBloque, direccion) => {
    const clave = claveBloque(grupo.tabla, bloque);
    const actual = ordenDraft[clave] ?? ordenServidorBloque(grupo.tabla, bloque);
    const posLocal = indiceEnBloque - bloque.inicio;
    const otroLocal = posLocal + direccion;
    if (otroLocal < 0 || otroLocal >= actual.length) return;

    const idMovido = actual[posLocal];
    const idOtro = actual[otroLocal];

    const nuevo = [...actual];
    [nuevo[posLocal], nuevo[otroLocal]] = [nuevo[otroLocal], nuevo[posLocal]];
    setOrdenDraft((prev) => ({ ...prev, [clave]: nuevo }));

    destacarFilas([idMovido, idOtro]);
  };
```

- [ ] **Step 4: Apply the highlight class on the row**

Find the `<tr>` in the table body:

```jsx
                    return (
                      <tr
                        key={fila.participanteId}
                        className={`border-b border-white/[.06] ${
                          fila.empatado ? "bg-warning/[.06]" : ""
                        } ${estado === "clasificado" ? "border-l-2 border-l-success" : ""} ${
                          estado === "eliminado" ? "border-l-2 border-l-error" : ""
                        }`}
                      >
```

Replace the `className` template with:

```jsx
                      <tr
                        key={fila.participanteId}
                        className={`border-b border-white/[.06] transition-colors duration-500 ${
                          destacados.has(fila.participanteId)
                            ? "bg-primary-500/20"
                            : fila.empatado
                              ? "bg-warning/[.06]"
                              : ""
                        } ${estado === "clasificado" ? "border-l-2 border-l-success" : ""} ${
                          estado === "eliminado" ? "border-l-2 border-l-error" : ""
                        }`}
                      >
```

- [ ] **Step 5: Run the full ligaDesempate + liga e2e suites to check for regressions**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/liga.spec.js tests/e2e/admin/ligaDesempate.spec.js`
Expected: PASS — no test asserts on the flash itself, but every test that clicks ↑/↓ now exercises `destacarFilas`/the timeout path without throwing.

- [ ] **Step 6: Manual verification**

Run the dev server (`npm run dev`), log in as admin, open a group with an unresolved tie (e.g. right after seeding a fresh liga, any group has all 7 participants tied at 0 points), and click "Bajar" on the first row. Confirm: the row that moved and the row it swapped with both light up with a visible tinted background that fades back to normal over about half a second, and clicking rapidly a few times in a row doesn't leave a row stuck highlighted or cause a console error.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/liga/grupo/\[numero\]/GrupoDetalle.js
git commit -m "feat(liga): destellar las filas que intercambian posicion al mover el desempate"
```

---

## Post-implementation check

After Task 2, re-read the spec (`docs/superpowers/specs/2026-08-06-liga-desempate-panel-y-feedback-design.md`) against the final `GrupoDetalle.js`:

- §1 (panel fuera de la tabla) → Task 1.
- §2 (destello al mover) → Task 2.
- "No-objetivos" (sin librería nueva, flechas no se mueven, lógica de negocio intacta) → verified by both tasks touching only presentation code and the diff not adding any new dependency.
