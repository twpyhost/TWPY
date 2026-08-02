// Suite: torneos y resultados publicos (TS-TOR)
// Nivel: sistema / e2e. Cobertura: /torneos y /torneo-resultado/[slug].
// Tecnicas: particion de equivalencia sobre el filtro de anos y valores
// limite sobre el slug de la pagina de resultados.
// Datos: sembrados por globalSetup -- ver tests/e2e/fixtures/seed.js.
import { test, expect } from "@playwright/test";

import {
  TEMPORADA_ACTUAL,
  TEMPORADA_ANTERIOR,
  TORNEO_ACTUAL,
  TORNEO_PREVIO,
  TORNEO_VIEJO,
  nombreJugador,
} from "../fixtures/datos.js";

// Clases de equivalencia del slug de /torneo-resultado/:
//   numerico existente   -> 200 con resultados
//   numerico inexistente -> 404
//   no numerico          -> 404 (getTorneoResultados corta en Number.isFinite)
//   limite: 0            -> 404 (numerico valido pero sin torneo)
// La fila de un torneo DENTRO del listado. Se filtra por el subtitulo "Torneo
// ranked" que llevan las filas, porque la tarjeta "ULTIMO TORNEO" de arriba
// tiene su propio link al mismo resultado y aparece siempre, sin importar el
// filtro de temporada (es intencional: es el ultimo torneo del circuito).
function filaDeTorneo(page, torneoId) {
  return page
    .locator(`a[href="/torneo-resultado/${torneoId}"]`)
    .filter({ hasText: "Torneo ranked" });
}

const CASOS_SLUG = [
  { clase: "numerico inexistente", slug: "999999999" },
  { clase: "no numerico", slug: "no-es-un-id" },
  { clase: "cero (limite inferior)", slug: "0" },
  { clase: "negativo", slug: "-1" },
];

test.describe("TS-TOR | Torneos publicos", () => {
  /**
   * TC-TOR-001 | El listado muestra los torneos importados
   * Descripcion: /torneos lista los torneos con su nombre como encabezado.
   * Precondiciones: 3 torneos sembrados.
   * Pasos:
   *   1. Ir a /torneos
   * Resultado esperado: el torneo mas reciente aparece en el listado.
   * Tecnica: particion de equivalencia (caso feliz) | Prioridad: alta
   */
  test("TC-TOR-001 | el listado muestra los torneos sembrados", async ({ page }) => {
    await page.goto("/torneos");

    await expect(page.getByRole("heading", { name: "Torneo E2E Actual" })).toBeVisible();
  });

  /**
   * TC-TOR-002 | El filtro por temporada acota el listado
   * Descripcion: elegir una temporada en el filtro deja solo los torneos de
   *   esa temporada.
   * Precondiciones: torneos en dos temporadas distintas.
   * Pasos:
   *   1. Ir a /torneos
   *   2. Elegir la temporada anterior en el filtro
   * Resultado esperado: se ve el torneo de esa temporada y no los de la otra.
   * Tecnica: particion de equivalencia | Prioridad: media
   */
  test("TC-TOR-002 | el filtro por temporada acota el listado", async ({ page }) => {
    await page.goto("/torneos");

    await page.locator(`a[href="/torneos?year=${TEMPORADA_ANTERIOR}"]`).click();

    await expect(filaDeTorneo(page, TORNEO_VIEJO)).toBeVisible();
    await expect(filaDeTorneo(page, TORNEO_ACTUAL)).toHaveCount(0);
  });

  /**
   * TC-TOR-003 | La pagina de resultados de un torneo existente carga
   * Descripcion: /torneo-resultado/<id> responde 200 y muestra los
   *   participantes. Cubre ademas la regresion del bloqueo de RLS: la vista
   *   publica torneo_resultados_publicos tiene que ser legible por anon.
   * Precondiciones: torneo sembrado con 45 participantes resueltos.
   * Pasos:
   *   1. Ir a /torneo-resultado/<id del torneo actual>
   * Resultado esperado: status < 400 y el campeon visible.
   * Tecnica: particion de equivalencia (caso feliz) | Prioridad: alta
   */
  test("TC-TOR-003 | los resultados de un torneo existente cargan", async ({ page }) => {
    const respuesta = await page.goto(`/torneo-resultado/${TORNEO_ACTUAL}`);

    expect(respuesta.status()).toBeLessThan(400);
    await expect(page.getByText(nombreJugador(1)).first()).toBeVisible();
  });

  /**
   * TC-TOR-004 | El boton de bracket aparece solo si el torneo tiene url
   * Descripcion: ChallongeLinkButton no renderiza nada cuando url_challonge
   *   es null (historicos importados sin url).
   * Precondiciones: un torneo sembrado con url y otro sin url.
   * Pasos:
   *   1. Abrir los resultados del torneo con url
   *   2. Abrir los resultados del torneo sin url
   * Resultado esperado: el boton esta en el primero y no en el segundo.
   * Tecnica: particion de equivalencia (url presente / ausente) | Prioridad: media
   */
  test("TC-TOR-004 | el boton de bracket depende de que haya url", async ({ page }) => {
    await page.goto(`/torneo-resultado/${TORNEO_ACTUAL}`);
    await expect(page.getByRole("button", { name: /VER BRACKET EN CHALLONGE/ })).toBeVisible();

    // TORNEO_PREVIO se sembro con url_challonge null a proposito.
    await page.goto(`/torneo-resultado/${TORNEO_PREVIO}`);
    await expect(page.getByText(nombreJugador(1)).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /VER BRACKET EN CHALLONGE/ })).toHaveCount(0);
  });

  for (const caso of CASOS_SLUG) {
    /**
     * TC-TOR-005 | Slug <clase> muestra el 404
     * Descripcion: cualquier slug que no resuelva a un torneo con resultados
     *   cae en notFound() y muestra la pagina 404, sin error 500 y sin
     *   filtrar resultados de otro torneo.
     * Precondiciones: ninguna.
     * Pasos:
     *   1. Navegar a /torneo-resultado/<slug de la clase>
     * Resultado esperado: se ve la pagina 404 y la respuesta no es 5xx.
     * Tecnica: particion de equivalencia + valores limite | Prioridad: alta
     *
     * OJO -- soft 404 conocido: el status HTTP es 200, no 404, porque la
     * pagina ya empezo a streamear antes de llegar al notFound() (tiene
     * generateMetadata y datos async). Es comportamiento preexistente y
     * afecta SEO: Google puede indexar estas URLs. Se assertea el contenido,
     * que es lo que ve la persona; el status queda anotado como deuda.
     */
    test(`TC-TOR-005 | slug ${caso.clase} muestra el 404`, async ({ page }) => {
      const respuesta = await page.goto(`/torneo-resultado/${caso.slug}`);

      expect(respuesta.status()).toBeLessThan(500);
      await expect(page.getByText("404").first()).toBeVisible();
    });
  }

  /**
   * TC-TOR-006 | El torneo de la temporada actual figura en su temporada
   * Descripcion: coherencia entre el filtro de anos del listado y la
   *   temporada del torneo.
   * Precondiciones: torneos sembrados en dos temporadas.
   * Pasos:
   *   1. Ir a /torneos filtrando por la temporada actual
   * Resultado esperado: los dos torneos de esa temporada estan listados.
   * Tecnica: particion de equivalencia | Prioridad: baja
   */
  test("TC-TOR-006 | la temporada actual lista sus dos torneos", async ({ page }) => {
    await page.goto("/torneos");
    await page.locator(`a[href="/torneos?year=${TEMPORADA_ACTUAL}"]`).click();

    await expect(filaDeTorneo(page, TORNEO_ACTUAL)).toBeVisible();
    await expect(filaDeTorneo(page, TORNEO_PREVIO)).toBeVisible();
    await expect(filaDeTorneo(page, TORNEO_VIEJO)).toHaveCount(0);
  });
});
