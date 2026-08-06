# Rediseño del desempate manual (admin) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix `/admin/liga/grupo/[numero]` so an admin can freely reorder a tied block with ↑/↓ (no save-per-click, no page flicker), explicitly confirm or discard the reorder, keep editing a block after it's been resolved, and never close a group while a tie is still unresolved.

**Architecture:** All changes are confined to the liga admin vertical slice: one pure helper added to `src/lib/ligaTabla.js`, one guard added to the existing `cerrar` API route, and a rework of the client component `GrupoDetalle.js` to hold a local "draft" reorder per tied block instead of saving on every arrow click. No schema change, no API contract change for `PUT /desempate`.

**Tech Stack:** Next.js App Router (route handlers), React client component (`"use client"`), Supabase (Postgres) via `getSupabaseAdmin()`, `react-hot-toast`, Playwright (`unit` project for pure-function tests, `e2e-admin` project for authenticated browser tests).

## Global Constraints

- Do not change the `PUT /api/admin/liga/grupos/[numero]/desempate` request contract (`{ orden: [participanteId, …] }`, 1-indexed assignment to `orden_desempate`).
- Do not change the `liga_participantes.orden_desempate` schema or its "keep the value, ignore it when it doesn't apply" semantics in `calcularTabla`.
- The final classification (position) must always resolve to a strict order — a group can never be closed while `calcularTabla` reports `empatado: true` for any row.
- Reopening a closed group (`cerrado: false`) is never blocked by pending ties — only closing (`cerrado: true`) is.
- No new screens or visual patterns — reuse the existing `Button`, `StatusChip`, `ConfirmModal`, and table layout already in `GrupoDetalle.js`.
- Tests follow existing repo conventions: pure functions get `tests/unit/*.test.js` (Playwright `unit` project, no browser); anything touching an API route or the rendered page gets a Playwright `e2e-admin` spec (real browser, real local Supabase stack, real dev server) — this codebase has no direct unit-test harness for Next.js route handlers or React components.

---

### Task 1: `bloquesPorPuntos` — group table rows by points, regardless of resolved state

**Files:**
- Modify: `src/lib/ligaTabla.js`
- Test: `tests/unit/ligaTabla.test.js`

**Interfaces:**
- Produces: `bloquesPorPuntos(tabla: FilaTabla[]) -> Array<{ inicio: number, fin: number }>`, exported from `src/lib/ligaTabla.js`. `tabla` is the array returned by `calcularTabla` (already sorted by `puntos` desc). Returns one entry per contiguous run of 2+ rows sharing the same `puntos`, regardless of whether `empatado` is `true` or `false` on those rows.

- [ ] **Step 1: Write the failing tests**

Add to the bottom of `tests/unit/ligaTabla.test.js` (the file already imports `calcularTabla` and defines the `participante`/`partido` helpers at the top — reuse them):

```js
import { calcularTabla, bloquesPorPuntos } from "../../src/lib/ligaTabla.js";
```

(replace the existing `import { calcularTabla } from "../../src/lib/ligaTabla.js";` line with the one above), then add before the final closing `});` of the file:

```js

test.describe("bloquesPorPuntos", () => {
  test("agrupa un bloque de 2 aunque ya tenga orden_desempate asignado", () => {
    const participantes = [participante(1, "A", 1), participante(2, "B", 2)];
    const tabla = calcularTabla(participantes, []); // ambos en 0 puntos, ya resuelto

    expect(bloquesPorPuntos(tabla)).toEqual([{ inicio: 0, fin: 2 }]);
  });

  test("detecta varios bloques a distinto puntaje y deja afuera a quien no comparte puntos", () => {
    const participantes = [
      participante(1, "A"),
      participante(2, "B"),
      participante(3, "C"),
      participante(4, "D"),
    ];
    // A le gana a C y D (2 puntos, sola en su puntaje).
    // C y D le ganan a B (1 punto cada una, empatadas entre si).
    // B pierde ambas (0 puntos, sola en su puntaje).
    const partidos = [
      partido(1, 3, 1),
      partido(1, 4, 1),
      partido(2, 3, 3),
      partido(2, 4, 4),
    ];
    const tabla = calcularTabla(participantes, partidos);

    expect(tabla.map((f) => f.nombre)).toEqual(["A", "C", "D", "B"]);
    expect(bloquesPorPuntos(tabla)).toEqual([{ inicio: 1, fin: 3 }]);
  });

  test("no devuelve bloques si nadie comparte puntaje", () => {
    const participantes = [participante(1, "A"), participante(2, "B"), participante(3, "C")];
    const partidos = [partido(1, 2, 1), partido(1, 3, 1), partido(2, 3, 2)];
    const tabla = calcularTabla(participantes, partidos);

    expect(bloquesPorPuntos(tabla)).toEqual([]);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npx playwright test --project=unit tests/unit/ligaTabla.test.js`
Expected: FAIL — `bloquesPorPuntos is not a function` (or import error), the 3 new tests red.

- [ ] **Step 3: Implement `bloquesPorPuntos` in `src/lib/ligaTabla.js`**

Add this export at the bottom of `src/lib/ligaTabla.js`, after `calcularTabla`:

```js

// Bloques contiguos que comparten puntaje, resueltos o no -- a diferencia
// del campo `empatado` (que se apaga apenas todos tienen orden_desempate),
// esto agrupa por puntos para que el admin pueda seguir reordenando un
// bloque despues de resolverlo. `calcularTabla` ya deja las filas
// ordenadas por puntos, asi que un bloque es siempre un rango contiguo.
export function bloquesPorPuntos(tabla) {
  const bloques = [];
  let i = 0;
  while (i < tabla.length) {
    let j = i + 1;
    while (j < tabla.length && tabla[j].puntos === tabla[i].puntos) {
      j += 1;
    }
    if (j - i > 1) bloques.push({ inicio: i, fin: j });
    i = j;
  }
  return bloques;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx playwright test --project=unit tests/unit/ligaTabla.test.js`
Expected: PASS — all tests in the file green, including the 3 new ones.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ligaTabla.js tests/unit/ligaTabla.test.js
git commit -m "feat(liga): agregar bloquesPorPuntos para agrupar filas empatadas por puntaje"
```

---

### Task 2: Block closing a group while a tie is unresolved (backend guard)

**Files:**
- Modify: `src/app/api/admin/liga/grupos/[numero]/cerrar/route.js`
- Test: `tests/e2e/admin/ligaDesempate.spec.js` (new file)

**Interfaces:**
- Consumes: `calcularTabla(participantes, partidos, { cuposClasificados }) -> FilaTabla[]` (existing, `src/lib/ligaTabla.js`), each `FilaTabla` has `.empatado: boolean`.
- Produces: `PUT /api/admin/liga/grupos/[numero]/cerrar` now returns `409 { error: "..." }` when `cerrado: true` is requested and any row of that group's table has `empatado: true`. Behavior for `cerrado: false` (reabrir) is unchanged.

- [ ] **Step 1: Write the failing e2e test**

Create `tests/e2e/admin/ligaDesempate.spec.js`:

```js
// Suite: rediseno del desempate manual (admin) -- ver
// docs/superpowers/specs/2026-08-06-liga-desempate-admin-design.md.
// Corre en "e2e-admin" (sesion de admin autenticada). Siembra su propia
// liga bajo un slug exclusivo, igual que tests/e2e/admin/liga.spec.js, asi
// no interfiere con esa suite ni con la liga real.
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../../testSupabase.js";
import { sembrarLiga } from "../../../src/lib/ligaSeed.js";
import fixtureReal from "../../../scripts/data/liga-2026-fixture.json" with { type: "json" };

test.describe("TS-LIGA-DESEMPATE | Desempate manual en la fase de grupos", () => {
  let supabase;
  let ligaId;

  test.beforeAll(async () => {
    supabase = getServiceClient();
    const fixture = { ...fixtureReal, slug: `liga-e2e-desempate-${Date.now()}` };
    const resumen = await sembrarLiga(supabase, fixture);
    ligaId = resumen.ligaId;
  });

  test.afterAll(async () => {
    await supabase.from("ligas").delete().eq("id", ligaId);
  });

  /**
   * TC-LIGA-DESEMPATE-001 | El grupo no se puede cerrar con empates sin resolver
   * Descripcion: un grupo recien sembrado tiene a todos los participantes en
   *   0 puntos (ningun resultado cargado todavia), asi que esta totalmente
   *   empatado. Pedirle a la API que lo cierre debe fallar.
   * Pasos: PUT /api/admin/liga/grupos/1/cerrar con { cerrado: true }.
   * Resultado esperado: 409 y un mensaje de error explicando el motivo.
   * Tecnica: caso negativo sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-001 | no se puede cerrar un grupo con empates sin resolver", async ({
    page,
  }) => {
    const response = await page.request.put("/api/admin/liga/grupos/1/cerrar", {
      data: { cerrado: true },
    });

    expect(response.status()).toBe(409);
    const body = await response.json();
    expect(body.error).toMatch(/empate/i);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js` (requires `supabase start` running locally — same setup as any other `e2e-admin` run).
Expected: FAIL — the route currently returns `200` (group closes), not `409`.

- [ ] **Step 3: Implement the guard in `cerrar/route.js`**

In `src/app/api/admin/liga/grupos/[numero]/cerrar/route.js`, add the `calcularTabla` import and, once `grupo` is loaded and validated, only when `cerrado` is `true`, fetch that group's participants/matches and reject if any row is still tied:

```js
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/apiAuth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { obtenerLigaActual, obtenerGrupoPorNumero } from "@/lib/ligaAdmin";
import { calcularTabla } from "@/lib/ligaTabla";

export async function PUT(req, { params }) {
  try {
    const auth = await requireAdmin();
    if (auth.error) return auth.error;

    const numero = Number((await params).numero);
    if (!Number.isInteger(numero)) {
      return Response.json({ error: "Numero de grupo invalido" }, { status: 400 });
    }

    const { cerrado } = await req.json();
    if (typeof cerrado !== "boolean") {
      return Response.json({ error: "Se requiere cerrado (boolean)" }, { status: 400 });
    }

    const supabase = getSupabaseAdmin();
    const liga = await obtenerLigaActual(supabase);
    if (!liga) {
      return Response.json({ error: "No hay ninguna liga cargada" }, { status: 404 });
    }

    const grupo = await obtenerGrupoPorNumero(supabase, liga.id, numero);
    if (!grupo) {
      return Response.json({ error: "Grupo no encontrado" }, { status: 404 });
    }

    if (cerrado) {
      const { data: participantes, error: participantesError } = await supabase
        .from("liga_participantes")
        .select("id, grupo_id, nombre, player_id, orden_desempate")
        .eq("grupo_id", grupo.id);
      if (participantesError) throw participantesError;

      const { data: partidos, error: partidosError } = await supabase
        .from("liga_partidos")
        .select("participante_a_id, participante_b_id, ganador_id")
        .eq("grupo_id", grupo.id);
      if (partidosError) throw partidosError;

      const tabla = calcularTabla(participantes, partidos, {
        cuposClasificados: grupo.cupos_clasificados,
      });
      if (tabla.some((fila) => fila.empatado)) {
        return Response.json(
          {
            error:
              "Hay empates sin resolver: asigna un orden de desempate antes de cerrar el grupo",
          },
          { status: 409 },
        );
      }
    }

    const { error: updateError } = await supabase
      .from("liga_grupos")
      .update({ cerrado })
      .eq("id", grupo.id);
    if (updateError) throw updateError;

    revalidatePath("/liga");

    return Response.json(
      { message: cerrado ? "Grupo cerrado" : "Grupo reabierto" },
      { status: 200 },
    );
  } catch (error) {
    console.error(error);
    return Response.json(
      { error: "Ocurrio un error al cambiar el estado del grupo" },
      { status: 500 },
    );
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/liga/grupos/\[numero\]/cerrar/route.js tests/e2e/admin/ligaDesempate.spec.js
git commit -m "feat(liga): bloquear el cierre de un grupo con empates sin resolver"
```

---

### Task 3: Local draft reorder — arrows always visible for any tied-by-points block

**Files:**
- Modify: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`
- Test: `tests/e2e/admin/ligaDesempate.spec.js`

**Interfaces:**
- Consumes: `bloquesPorPuntos` from Task 1 (`@/lib/ligaTabla`).
- Produces (module-level helpers in `GrupoDetalle.js`, used by Task 4 too):
  - `claveBloque(tabla, bloque) -> string` — stable key for a block, built from its sorted `participanteId`s.
  - `ordenServidorBloque(tabla, bloque) -> number[]` — the block's `participanteId`s in the order the server currently has them.
- Produces (component state, used by Task 4 too): `ordenDraft` (`useState({})`, shape `{ [clave]: participanteId[] }`) and a `moverEnDraft(bloque, indiceEnBloque, direccion)` handler that mutates `ordenDraft` only — no network call.

This task has no isolated unit test (it's a client component with no test harness in this repo other than Playwright `e2e-admin`) — steps 1–2 write and red-check the e2e test, matching the file already created in Task 2, then step 3 implements.

- [ ] **Step 1: Write the failing e2e test**

Add this test inside the same `test.describe` block in `tests/e2e/admin/ligaDesempate.spec.js` (after the Task 2 test, before the closing `});` of the describe):

```js

  /**
   * TC-LIGA-DESEMPATE-002 | Las flechas de desempate siguen visibles despues de resolverlo
   * Descripcion: hoy, en cuanto se asigna orden_desempate a todo un bloque
   *   empatado, ese bloque deja de estar "empatado" y las flechas
   *   desaparecen -- sin forma de corregir el orden despues. Se simula un
   *   bloque ya resuelto escribiendo orden_desempate directo en la base (sin
   *   pasar por la UI) y se verifica que las flechas sigan ahi.
   * Pasos:
   *   1. Asignar orden_desempate 1..7 a los 7 participantes del grupo 2.
   *   2. Ir a /admin/liga/grupo/2.
   * Resultado esperado: la primera fila de la tabla muestra el boton "Bajar".
   * Tecnica: regresion sobre el bug reportado | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-002 | las flechas siguen visibles despues de resolver el bloque", async ({
    page,
  }) => {
    const { data: grupo2 } = await supabase
      .from("liga_grupos")
      .select("id")
      .eq("liga_id", ligaId)
      .eq("numero", 2)
      .single();
    const { data: participantes } = await supabase
      .from("liga_participantes")
      .select("id")
      .eq("grupo_id", grupo2.id)
      .order("id", { ascending: true });

    for (let i = 0; i < participantes.length; i += 1) {
      await supabase
        .from("liga_participantes")
        .update({ orden_desempate: i + 1 })
        .eq("id", participantes[i].id);
    }

    await page.goto("/admin/liga/grupo/2");

    const primeraFila = page.getByRole("row").nth(1); // fila 0 es el encabezado
    await expect(primeraFila.getByRole("button", { name: "Bajar" })).toBeVisible();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-002"`
Expected: FAIL — the "Bajar" button is not visible because `fila.empatado` is `false` once every row has `orden_desempate`, so the current code hides the arrows entirely.

- [ ] **Step 3: Rework `GrupoDetalle.js`**

Replace the `bloquesEmpatados` function (top of the file, right after the imports) with `bloquesPorPuntos` import plus the two new helpers:

```js
import { bloquesPorPuntos } from "@/lib/ligaTabla";
```

(add this to the import block at the top, alongside the existing `ConfirmModal` import)

Delete the entire existing `bloquesEmpatados` function block and replace it with:

```js
// Identifica un bloque de forma estable entre renders, por el conjunto de
// participantes que lo componen -- no por su posicion en la tabla -- para
// que un borrador de reordenamiento (ordenDraft) siga siendo valido aunque
// otro bloque cambie de tamano en un refresco de datos.
function claveBloque(tabla, bloque) {
  return tabla
    .slice(bloque.inicio, bloque.fin)
    .map((f) => f.participanteId)
    .sort((a, b) => a - b)
    .join("-");
}

function ordenServidorBloque(tabla, bloque) {
  return tabla.slice(bloque.inicio, bloque.fin).map((f) => f.participanteId);
}
```

Remove the `guardandoDesempate` state line:

```js
const [guardandoDesempate, setGuardandoDesempate] = useState(false);
```

and add, in its place:

```js
const [ordenDraft, setOrdenDraft] = useState({});
```

Replace the `bloques` memo:

```js
const bloques = useMemo(() => (grupo ? bloquesEmpatados(grupo.tabla) : []), [grupo]);
```

with:

```js
const bloques = useMemo(() => (grupo ? bloquesPorPuntos(grupo.tabla) : []), [grupo]);

const filasVisibles = useMemo(() => {
  if (!grupo) return [];
  const filaPorId = new Map(grupo.tabla.map((f) => [f.participanteId, f]));
  const filas = [...grupo.tabla];
  for (const bloque of bloques) {
    const clave = claveBloque(grupo.tabla, bloque);
    const orden = ordenDraft[clave] ?? ordenServidorBloque(grupo.tabla, bloque);
    for (let k = 0; k < orden.length; k += 1) {
      filas[bloque.inicio + k] = filaPorId.get(orden[k]);
    }
  }
  return filas;
}, [grupo, bloques, ordenDraft]);
```

Replace the whole `moverEnBloque` function:

```js
const moverEnBloque = async (bloque, indiceEnBloque, direccion) => {
  const filas = grupo.tabla.slice(bloque.inicio, bloque.fin);
  const posLocal = indiceEnBloque - bloque.inicio;
  const otroLocal = posLocal + direccion;
  if (otroLocal < 0 || otroLocal >= filas.length) return;

  const nuevo = [...filas];
  [nuevo[posLocal], nuevo[otroLocal]] = [nuevo[otroLocal], nuevo[posLocal]];

  setGuardandoDesempate(true);
  try {
    const response = await fetch(`/api/admin/liga/grupos/${numero}/desempate`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orden: nuevo.map((f) => f.participanteId) }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "No se pudo guardar el desempate");
    await cargar();
  } catch (error) {
    toast.error(error.message);
  } finally {
    setGuardandoDesempate(false);
  }
};
```

with a purely local version:

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

Finally, replace the table body — `{grupo.tabla.map((fila, indice) => { ... })}` and everything inside it down to its closing `})}` — with:

```jsx
{filasVisibles.map((fila, indice) => {
  const bloque = bloques.find(
    (b) => indice >= b.inicio && indice < b.fin,
  );
  const posicion = indice + 1;
  let estado = "neutral";
  if (posicion <= grupo.cuposClasificados) estado = "clasificado";
  else if (posicion > filasVisibles.length - 2) estado = "eliminado";

  return (
    <tr
      key={fila.participanteId}
      className={`border-b border-white/[.06] ${
        fila.empatado ? "bg-warning/[.06]" : ""
      } ${estado === "clasificado" ? "border-l-2 border-l-success" : ""} ${
        estado === "eliminado" ? "border-l-2 border-l-error" : ""
      }`}
    >
      <td className="px-3 py-2.5 font-display text-lg text-white/70">
        {posicion}
      </td>
      <td className="px-3 py-2.5 font-body text-sm font-bold text-white">
        {fila.nombre}
      </td>
      <td className="px-3 py-2.5 text-right font-body text-sm text-white/70">
        {fila.pj}
      </td>
      <td className="px-3 py-2.5 text-right font-body text-sm text-white/70">
        {fila.g}
      </td>
      <td className="px-3 py-2.5 text-right font-body text-sm text-white/70">
        {fila.p}
      </td>
      <td className="px-3 py-2.5 text-right font-display text-base text-white">
        {fila.puntos}
      </td>
      <td className="px-3 py-2.5 text-right">
        {bloque && (
          <div className="inline-flex gap-1">
            <button
              type="button"
              disabled={indice === bloque.inicio || grupo.cerrado}
              onClick={() => moverEnDraft(bloque, indice, -1)}
              className="flex h-6 w-6 items-center justify-center border border-white/20 bg-white/[.04] text-xs text-white disabled:opacity-30"
              aria-label="Subir"
            >
              ↑
            </button>
            <button
              type="button"
              disabled={indice === bloque.fin - 1 || grupo.cerrado}
              onClick={() => moverEnDraft(bloque, indice, 1)}
              className="flex h-6 w-6 items-center justify-center border border-white/20 bg-white/[.04] text-xs text-white disabled:opacity-30"
              aria-label="Bajar"
            >
              ↓
            </button>
          </div>
        )}
      </td>
    </tr>
  );
})}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-002"`
Expected: PASS.

- [ ] **Step 5: Run the full existing liga e2e suite to check for regressions**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/liga.spec.js`
Expected: PASS — `TC-LIGA-ADMIN-001` and `TC-LIGA-ADMIN-002` still work (they don't touch tied blocks, but they do render this same table).

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/liga/grupo/\[numero\]/GrupoDetalle.js tests/e2e/admin/ligaDesempate.spec.js
git commit -m "feat(liga): reordenar un bloque empatado en un borrador local, sin guardar en cada click"
```

---

### Task 4: Confirm / Discard the draft, with a toast and a silent background refresh

**Files:**
- Modify: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`
- Test: `tests/e2e/admin/ligaDesempate.spec.js`

**Interfaces:**
- Consumes: `claveBloque`, `ordenServidorBloque`, `ordenDraft`/`setOrdenDraft`, `moverEnDraft`, `filasVisibles`, `bloques` — all from Task 3.
- Produces: `cargar({ silent } = {})` (silent skips the `loading` flag, so it never hides the table behind "Cargando…"); `confirmarBloque(bloque)` (PUT the draft to `/desempate`, toast, silent refresh); `descartarBloque(bloque)` (drop the draft for that block); `hayCambiosPendientes(bloque) -> boolean`.

- [ ] **Step 1: Write the failing e2e test**

Add this test to `tests/e2e/admin/ligaDesempate.spec.js`, after the Task 3 test:

```js

  /**
   * TC-LIGA-DESEMPATE-003 | Confirmar un desempate lo guarda de verdad
   * Descripcion: mover una fila con las flechas no debe guardar nada hasta
   *   que se confirme; al confirmar debe aparecer un toast y el nuevo orden
   *   debe sobrevivir un F5 real (prueba de que quedo en la base, no solo en
   *   el estado local del componente).
   * Pasos:
   *   1. Ir a /admin/liga/grupo/3 (recien sembrado: los 7 participantes
   *      estan en 0 puntos, un solo bloque empatado con todo el grupo).
   *   2. Click en "Bajar" en la primera fila -- el nombre que estaba primero
   *      pasa a la segunda fila.
   *   3. Click en "Confirmar".
   *   4. Recargar la pagina.
   * Resultado esperado: el toast "Desempate guardado" aparece tras el paso
   *   3, y despues de recargar la fila que se movio sigue en la posicion 2.
   * Tecnica: caso feliz de punta a punta | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-003 | confirmar un desempate lo persiste", async ({ page }) => {
    await page.goto("/admin/liga/grupo/3");

    const primeraFilaAntes = page.getByRole("row").nth(1);
    const nombreMovido = await primeraFilaAntes.getByRole("cell").nth(1).innerText();

    await primeraFilaAntes.getByRole("button", { name: "Bajar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Desempate guardado")).toBeVisible();

    await page.reload();

    const segundaFilaDespues = page.getByRole("row").nth(2);
    await expect(segundaFilaDespues.getByRole("cell").nth(1)).toHaveText(nombreMovido);
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-003"`
Expected: FAIL — there is no "Confirmar" button yet (Task 3 only added local reordering).

- [ ] **Step 3: Implement confirm/discard in `GrupoDetalle.js`**

Add a new state next to `ordenDraft`:

```js
const [bloquesGuardando, setBloquesGuardando] = useState(new Set());
```

Replace the `cargar` function:

```js
const cargar = useCallback(async () => {
  setLoading(true);
  try {
    const response = await fetch(`/api/admin/liga/grupos/${numero}`);
    const body = await response.json();
    setData(response.ok ? body : null);
  } finally {
    setLoading(false);
  }
}, [numero]);
```

with:

```js
const cargar = useCallback(
  async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch(`/api/admin/liga/grupos/${numero}`);
      const body = await response.json();
      setData(response.ok ? body : null);
    } finally {
      if (!silent) setLoading(false);
    }
  },
  [numero],
);
```

In `cargarGanador`, replace `await cargar();` with `await cargar({ silent: true });` — the table stays on screen while the background refresh happens, instead of flashing to "Cargando…".

In `cambiarCerrado`, replace `await cargar();` with `await cargar({ silent: true });` for the same reason.

Add these three functions right after `moverEnDraft`:

```js
const hayCambiosPendientes = (bloque) => {
  const clave = claveBloque(grupo.tabla, bloque);
  const draft = ordenDraft[clave];
  if (!draft) return false;
  const servidor = ordenServidorBloque(grupo.tabla, bloque);
  return draft.some((id, i) => id !== servidor[i]);
};

const confirmarBloque = async (bloque) => {
  const clave = claveBloque(grupo.tabla, bloque);
  const orden = ordenDraft[clave];
  if (!orden) return;

  setBloquesGuardando((prev) => new Set(prev).add(clave));
  try {
    const response = await fetch(`/api/admin/liga/grupos/${numero}/desempate`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orden }),
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "No se pudo guardar el desempate");

    setOrdenDraft((prev) => {
      const siguiente = { ...prev };
      delete siguiente[clave];
      return siguiente;
    });
    toast.success("Desempate guardado");
    await cargar({ silent: true });
  } catch (error) {
    toast.error(error.message);
  } finally {
    setBloquesGuardando((prev) => {
      const siguiente = new Set(prev);
      siguiente.delete(clave);
      return siguiente;
    });
  }
};

const descartarBloque = (bloque) => {
  const clave = claveBloque(grupo.tabla, bloque);
  setOrdenDraft((prev) => {
    const siguiente = { ...prev };
    delete siguiente[clave];
    return siguiente;
  });
};
```

In the table body (from Task 3), update both arrow buttons' `disabled` to also check `bloquesGuardando`:

```jsx
disabled={indice === bloque.inicio || grupo.cerrado}
```

becomes:

```jsx
disabled={
  indice === bloque.inicio ||
  grupo.cerrado ||
  bloquesGuardando.has(claveBloque(grupo.tabla, bloque))
}
```

and equivalently for the "Bajar" button, replacing `indice === bloque.fin - 1 || grupo.cerrado` with `indice === bloque.fin - 1 || grupo.cerrado || bloquesGuardando.has(claveBloque(grupo.tabla, bloque))`.

Right after the closing `</div>` of the arrows `<div className="inline-flex gap-1">…</div>` (still inside the same `<td>`), add:

```jsx
{bloque && indice === bloque.fin - 1 && hayCambiosPendientes(bloque) && (
  <div className="mt-1 inline-flex gap-1">
    <button
      type="button"
      disabled={bloquesGuardando.has(claveBloque(grupo.tabla, bloque))}
      onClick={() => confirmarBloque(bloque)}
      className="border border-success/40 bg-success/10 px-2 py-1 text-[11px] font-bold text-success disabled:opacity-40"
    >
      Confirmar
    </button>
    <button
      type="button"
      disabled={bloquesGuardando.has(claveBloque(grupo.tabla, bloque))}
      onClick={() => descartarBloque(bloque)}
      className="border border-white/20 bg-white/[.04] px-2 py-1 text-[11px] text-white/70 disabled:opacity-40"
    >
      Descartar
    </button>
  </div>
)}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-003"`
Expected: PASS.

- [ ] **Step 5: Run the full existing liga e2e suite to check for regressions**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/liga.spec.js`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/app/admin/liga/grupo/\[numero\]/GrupoDetalle.js tests/e2e/admin/ligaDesempate.spec.js
git commit -m "feat(liga): confirmar o descartar el borrador de desempate por bloque, sin recargar la pantalla"
```

---

### Task 5: Disable "CERRAR GRUPO" while a tie is pending

**Files:**
- Modify: `src/app/admin/liga/grupo/[numero]/GrupoDetalle.js`
- Test: `tests/e2e/admin/ligaDesempate.spec.js`

**Interfaces:**
- Consumes: `grupo.tabla[].empatado` (existing field from `calcularTabla`); the Task 2 backend guard (this task's e2e test also exercises that guard end-to-end through the UI).

- [ ] **Step 1: Write the failing e2e test**

Add this test to `tests/e2e/admin/ligaDesempate.spec.js`, after the Task 4 test:

```js

  /**
   * TC-LIGA-DESEMPATE-004 | CERRAR GRUPO se deshabilita con empates pendientes
   * Descripcion: un grupo recien sembrado esta totalmente empatado (0
   *   puntos para todos) -- el boton CERRAR GRUPO debe estar deshabilitado.
   *   Resolviendo el unico bloque empatado (mover + confirmar) el boton se
   *   habilita y el cierre funciona.
   * Pasos:
   *   1. Ir a /admin/liga/grupo/4 -- verificar CERRAR GRUPO deshabilitado.
   *   2. Mover y confirmar el bloque empatado (resuelve todo el grupo, que
   *      es un solo bloque de 7).
   *   3. Verificar CERRAR GRUPO habilitado, hacer click y confirmar en el modal.
   * Resultado esperado: el badge pasa a "CERRADO".
   * Tecnica: caso feliz sobre una restriccion de negocio | Prioridad: alta
   */
  test("TC-LIGA-DESEMPATE-004 | CERRAR GRUPO se deshabilita y habilita segun haya empates", async ({
    page,
  }) => {
    await page.goto("/admin/liga/grupo/4");

    const botonCerrar = page.getByRole("button", { name: "CERRAR GRUPO" });
    await expect(botonCerrar).toBeDisabled();

    await page.getByRole("row").nth(1).getByRole("button", { name: "Bajar" }).click();
    await page.getByRole("button", { name: "Confirmar" }).click();
    await expect(page.getByText("Desempate guardado")).toBeVisible();

    await expect(botonCerrar).toBeEnabled();
    await botonCerrar.click();
    await page.getByRole("button", { name: "CERRAR", exact: true }).click();

    await expect(page.getByText("CERRADO", { exact: true })).toBeVisible();
  });
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-004"`
Expected: FAIL — `CERRAR GRUPO` is currently always enabled.

- [ ] **Step 3: Implement the disabled state in `GrupoDetalle.js`**

Add, right after the `bloques`/`filasVisibles` memos:

```js
const hayEmpatesPendientes = grupo?.tabla.some((f) => f.empatado) ?? false;
```

Replace the button block inside `HeroSection`:

```jsx
<div className="flex flex-wrap items-center gap-3">
  <StatusChip tone={grupo.cerrado ? "neutral" : "success"}>
    {grupo.cerrado ? "CERRADO" : "ABIERTO"}
  </StatusChip>
  <Button
    variant="outline"
    onClick={() => setModalCerrarAbierto(true)}
    className="px-5 py-2.5 text-base"
  >
    {grupo.cerrado ? "REABRIR GRUPO" : "CERRAR GRUPO"}
  </Button>
</div>
```

with:

```jsx
<div className="flex flex-wrap items-center gap-3">
  <StatusChip tone={grupo.cerrado ? "neutral" : "success"}>
    {grupo.cerrado ? "CERRADO" : "ABIERTO"}
  </StatusChip>
  <Button
    variant="outline"
    onClick={() => setModalCerrarAbierto(true)}
    disabled={!grupo.cerrado && hayEmpatesPendientes}
    title={
      !grupo.cerrado && hayEmpatesPendientes
        ? "Resolvé los empates pendientes antes de cerrar el grupo"
        : undefined
    }
    className="px-5 py-2.5 text-base disabled:opacity-40"
  >
    {grupo.cerrado ? "REABRIR GRUPO" : "CERRAR GRUPO"}
  </Button>
  {!grupo.cerrado && hayEmpatesPendientes && (
    <p className="w-full text-right font-body text-xs text-warning">
      Resolvé los empates pendientes antes de cerrar el grupo.
    </p>
  )}
</div>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js -g "TC-LIGA-DESEMPATE-004"`
Expected: PASS.

- [ ] **Step 5: Run the full new spec file plus the existing liga e2e suite**

Run: `npx playwright test --project=e2e-admin tests/e2e/admin/ligaDesempate.spec.js tests/e2e/admin/liga.spec.js`
Expected: PASS — all 6 tests (2 existing + 4 new) green.

- [ ] **Step 6: Run the unit project too, to confirm no regressions there**

Run: `npx playwright test --project=unit`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/app/admin/liga/grupo/\[numero\]/GrupoDetalle.js tests/e2e/admin/ligaDesempate.spec.js
git commit -m "feat(liga): deshabilitar CERRAR GRUPO mientras queden empates pendientes"
```

---

## Post-implementation check

After Task 5, re-read the spec (`docs/superpowers/specs/2026-08-06-liga-desempate-admin-design.md`) top to bottom against the final `GrupoDetalle.js` and confirm every numbered design section (1–6) has a corresponding task:

- §1 (agrupar por puntos) → Task 1 + 3
- §2 (draft local por bloque) → Task 3
- §3 (Confirmar/Descartar) → Task 4
- §4 (sin parpadeo) → Task 4
- §5 (bloquear cierre) → Task 2 + 5
- §6 (orden_desempate se conserva) → no code change needed, already `calcularTabla`'s existing behavior — verified by Task 1's first test (a block resolved via `orden_desempate` is still correctly grouped/ignored as appropriate).
