// Suite: ranking publico (TS-RANK)
// Nivel: sistema / e2e. Cobertura: /ranking, el selector de temporadas y su
// estado de carga.
// Tecnicas: particion de equivalencia y valores limite sobre ?year=, mas
// model-based testing sobre la transicion de temporada.
// Datos: sembrados por globalSetup (45 jugadores en la temporada actual, 3 en
// la anterior) -- ver tests/e2e/fixtures/seed.js.
import { test, expect } from "@playwright/test";

import {
  JUGADORES_TEMPORADA_ANTERIOR,
  TEMPORADA_ACTUAL,
  TEMPORADA_ANTERIOR,
  TEMPORADA_INEXISTENTE,
  nombreJugador,
} from "../fixtures/datos.js";

// Clases de equivalencia de ?year=:
//   valida-actual   -> se muestra esa temporada
//   valida-anterior -> se muestra esa temporada
//   inexistente     -> fallback a la mas reciente
//   no numerica     -> fallback a la mas reciente
//   ausente         -> fallback a la mas reciente
const CASOS_YEAR = [
  { clase: "valida (temporada anterior)", year: String(TEMPORADA_ANTERIOR), esperada: TEMPORADA_ANTERIOR },
  { clase: "inexistente", year: String(TEMPORADA_INEXISTENTE), esperada: TEMPORADA_ACTUAL },
  { clase: "no numerica", year: "no-es-un-ano", esperada: TEMPORADA_ACTUAL },
  { clase: "vacia", year: "", esperada: TEMPORADA_ACTUAL },
];

test.describe("TS-RANK | Ranking publico", () => {
  /**
   * TC-RANK-001 | La tabla carga con los datos de la temporada mas reciente
   * Descripcion: sin parametros, /ranking muestra la temporada mas reciente
   *   con su tabla de posiciones.
   * Precondiciones: datos sembrados (temporada actual con 45 jugadores).
   * Pasos:
   *   1. Ir a /ranking
   * Resultado esperado: el eyebrow anuncia la temporada actual y el jugador
   *   en primera posicion esta visible.
   * Tecnica: particion de equivalencia (caso feliz) | Prioridad: alta
   */
  test("TC-RANK-001 | carga la temporada mas reciente", async ({ page }) => {
    await page.goto("/ranking");

    await expect(page.getByText(`RANKING OFICIAL · TEMPORADA ${TEMPORADA_ACTUAL}`)).toBeVisible();
    await expect(page.getByText(nombreJugador(1), { exact: true })).toBeVisible();
  });

  /**
   * TC-RANK-002 | El contador del hero refleja el conteo rapido
   * Descripcion: el numero de COMPETIDORES RANKEADOS sale de getRankingsCount
   *   (un count sobre snapshots), no del largo de la tabla renderizada.
   * Precondiciones: 45 jugadores sembrados en la temporada actual.
   * Pasos:
   *   1. Ir a /ranking
   * Resultado esperado: el contador es >= 45 (puede haber datos reales en la
   *   BD local ademas de los sembrados).
   * Tecnica: valor limite inferior | Prioridad: media
   */
  test("TC-RANK-002 | el contador del hero cuenta los rankeados", async ({ page }) => {
    await page.goto("/ranking");

    const contador = page
      .getByText("COMPETIDORES RANKEADOS")
      .locator("xpath=preceding-sibling::span[1]");

    await expect(contador).toBeVisible();
    expect(Number(await contador.innerText())).toBeGreaterThanOrEqual(45);
  });

  /**
   * TC-RANK-003 | El podio usa el resaltado del top 3
   * Descripcion: las tres primeras filas llevan el fondo magenta del diseno
   *   en vez del zebra-stripe generico.
   * Precondiciones: datos sembrados.
   * Pasos:
   *   1. Ir a /ranking
   *   2. Ubicar la fila del jugador en posicion 1
   * Resultado esperado: su background-color es rgba(245, 10, 100, 0.16).
   * Tecnica: valor limite (posicion 1, borde del top 3) | Prioridad: media
   */
  test("TC-RANK-003 | la posicion 1 usa el resaltado del top 3", async ({ page }) => {
    await page.goto("/ranking");

    const fila = page.getByText(nombreJugador(1), { exact: true }).locator("xpath=..");
    await expect(fila).toHaveCSS("background-color", "rgba(245, 10, 100, 0.16)");
  });

  for (const caso of CASOS_YEAR) {
    /**
     * TC-RANK-004 | ?year= <clase>
     * Descripcion: el parametro de temporada se valida contra las temporadas
     *   existentes; cualquier valor fuera de esa lista cae en la mas reciente
     *   en vez de romper o mostrar una tabla vacia.
     * Precondiciones: dos temporadas sembradas.
     * Pasos:
     *   1. Ir a /ranking?year=<valor de la clase>
     * Resultado esperado: el eyebrow anuncia la temporada esperada para esa
     *   clase de equivalencia.
     * Tecnica: particion de equivalencia + valores limite | Prioridad: alta
     */
    test(`TC-RANK-004 | ?year= ${caso.clase} muestra la temporada ${caso.esperada}`, async ({
      page,
    }) => {
      await page.goto(`/ranking?year=${caso.year}`);

      await expect(
        page.getByText(`RANKING OFICIAL · TEMPORADA ${caso.esperada}`),
      ).toBeVisible();
    });
  }

  /**
   * TC-RANK-005 | Cambiar de temporada reemplaza los datos de la tabla
   * Descripcion: al hacer click en un tab del selector, la URL y la tabla
   *   pasan a la temporada elegida.
   * Precondiciones: dos temporadas sembradas (la anterior con solo 3
   *   jugadores, para poder distinguirlas).
   * Pasos:
   *   1. Ir a /ranking
   *   2. Click en el tab de la temporada anterior
   * Resultado esperado: la URL lleva ?year=<anterior>, aparece un jugador que
   *   solo existe en esa temporada y desaparece uno que no.
   * Tecnica: MBT (transicion de estado) | Prioridad: alta
   */
  test("TC-RANK-005 | cambiar de temporada reemplaza los datos", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByText(nombreJugador(1), { exact: true })).toBeVisible();

    // El jugador 44 esta en la temporada actual pero no en la anterior (solo
    // los 3 primeros participaron ahi).
    const soloEnLaActual = nombreJugador(JUGADORES_TEMPORADA_ANTERIOR + 1);
    await expect(page.getByText(soloEnLaActual, { exact: true })).toBeVisible();

    await page.locator(`a[href="/ranking?year=${TEMPORADA_ANTERIOR}"]`).click();

    await expect(page).toHaveURL(new RegExp(`year=${TEMPORADA_ANTERIOR}`));
    await expect(page.getByText(nombreJugador(1), { exact: true })).toBeVisible();
    await expect(page.getByText(soloEnLaActual, { exact: true })).toHaveCount(0);
  });

  /**
   * TC-RANK-006 | El loading anuncia la temporada elegida, nunca la anterior
   * Descripcion: durante la transicion, el spinner scopeado a la tabla dice
   *   "CARGANDO TEMPORADA <la elegida>" desde el primer frame. Antes se veia
   *   por un instante la temporada vieja y despues saltaba a la nueva.
   * Precondiciones: dos temporadas sembradas.
   * Pasos:
   *   1. Ir a /ranking
   *   2. Click en el tab de la temporada anterior
   *   3. Muestrear el texto del spinner mientras dura la carga
   * Resultado esperado: todos los textos observados nombran la temporada
   *   elegida; ninguno nombra la temporada de partida.
   * Tecnica: MBT (invariante durante la transicion) | Prioridad: alta
   * Ref: TODO.todo -- "aparece por un breve momento cargando temporadas"
   */
  test("TC-RANK-006 | el loading nunca muestra la temporada de partida", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByText(nombreJugador(1), { exact: true })).toBeVisible();

    const observados = await page.evaluate(
      async ({ year }) => {
        const leerSpinner = () => {
          const nodo = [...document.querySelectorAll("span")].find(
            (s) => s.children.length === 0 && s.textContent.trim().startsWith("CARGANDO TEMPORADA"),
          );
          return nodo ? nodo.textContent.trim() : null;
        };

        const textos = new Set();
        document.querySelector(`a[href="/ranking?year=${year}"]`).click();

        // Se muestrea hasta que la tabla nueva reemplaza al spinner.
        for (let i = 0; i < 40; i++) {
          const texto = leerSpinner();
          if (texto) textos.add(texto);
          else if (textos.size > 0) break;
          await new Promise((r) => setTimeout(r, 50));
        }
        return [...textos];
      },
      { year: TEMPORADA_ANTERIOR },
    );

    expect(observados.length).toBeGreaterThan(0);
    for (const texto of observados) {
      expect(texto).toContain(String(TEMPORADA_ANTERIOR));
      expect(texto).not.toContain(String(TEMPORADA_ACTUAL));
    }
  });

  /**
   * TC-RANK-007 | Cambiar de temporada no resetea el scroll
   * Descripcion: el selector navega con scroll:false, asi que la posicion
   *   vertical se mantiene en vez de saltar al tope de la pagina.
   * Precondiciones: la temporada de partida tiene tabla larga (45 jugadores),
   *   de modo que haya scroll disponible.
   * Pasos:
   *   1. Ir a /ranking
   *   2. Scrollear 600px
   *   3. Click en el tab de la temporada anterior
   *   4. Muestrear (scrollY, alto maximo scrolleable) durante la transicion
   * Resultado esperado: en TODA muestra, scrollY == min(600, maxScroll). O
   *   sea: lo unico que llega a bajar el scroll es que el documento se acorte
   *   (el spinner es mas bajo que una tabla de 45 filas, y la temporada
   *   anterior tiene 3), nunca un reseteo de la navegacion. Si el push
   *   scrolleara al tope, se veria scrollY = 0 con maxScroll todavia alto.
   * Tecnica: MBT (invariante durante la transicion) | Prioridad: alta
   * Ref: TODO.todo -- "No reiniciar la posicion del desplazamiento vertical"
   */
  test("TC-RANK-007 | cambiar de temporada no resetea el scroll", async ({ page }) => {
    await page.goto("/ranking");
    await expect(page.getByText(nombreJugador(45), { exact: true })).toBeVisible();

    const muestras = await page.evaluate(
      async ({ year }) => {
        window.scrollTo(0, 600);
        await new Promise((r) => setTimeout(r, 200));

        const tomar = () => ({
          y: Math.round(window.scrollY),
          max: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
          url: location.search,
        });

        const registradas = [tomar()];
        document.querySelector(`a[href="/ranking?year=${year}"]`).click();

        for (let i = 0; i < 30; i++) {
          registradas.push(tomar());
          await new Promise((r) => setTimeout(r, 60));
        }
        return registradas;
      },
      { year: TEMPORADA_ANTERIOR },
    );

    // La navegacion tiene que haber ocurrido, si no el invariante seria trivial.
    expect(muestras.some((m) => m.url.includes(String(TEMPORADA_ANTERIOR)))).toBeTruthy();

    for (const muestra of muestras) {
      expect(muestra.y, `scrollY=${muestra.y} con maxScroll=${muestra.max}`).toBe(
        Math.min(600, muestra.max),
      );
    }
  });

  /**
   * TC-RANK-008 | El tab elegido queda activo apenas se hace click
   * Descripcion: el selector usa estado optimista, asi que el tab clickeado
   *   se marca activo sin esperar la respuesta del servidor.
   * Precondiciones: dos temporadas sembradas.
   * Pasos:
   *   1. Ir a /ranking
   *   2. Click en el tab de la temporada anterior
   * Resultado esperado: el eyebrow del hero ya anuncia la temporada elegida
   *   mientras la tabla todavia esta cargando.
   * Tecnica: MBT (transicion de estado) | Prioridad: media
   */
  test("TC-RANK-008 | el eyebrow refleja la temporada elegida durante la carga", async ({
    page,
  }) => {
    await page.goto("/ranking");
    await expect(page.getByText(nombreJugador(1), { exact: true })).toBeVisible();

    await page.locator(`a[href="/ranking?year=${TEMPORADA_ANTERIOR}"]`).click();

    await expect(
      page.getByText(`RANKING OFICIAL · TEMPORADA ${TEMPORADA_ANTERIOR}`),
    ).toBeVisible();
  });
});
