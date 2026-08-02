// Suite: reglamento (TS-REG)
// Nivel: sistema / e2e. Cobertura: /reglamento, sus anclas y la animacion de
// entrada de los subtitulos.
// Tecnica: cobertura de elementos + verificacion de estado visual.
// Datos: la pagina es estatica, no necesita seed.
import { test, expect } from "@playwright/test";

// Las seis secciones del reglamento, con el id del ancla que las apunta desde
// el indice lateral.
const SECCIONES = [
  { id: "r-formato", titulo: "FORMATO DE TORNEO" },
  { id: "r-horarios", titulo: "HORARIOS Y SETUPS" },
  { id: "r-equipamiento", titulo: "EQUIPAMIENTO" },
  { id: "r-juego", titulo: "EN LA PARTIDA" },
  { id: "r-conducta", titulo: "CONDUCTA" },
  { id: "r-resultados", titulo: "BRACKET Y RESULTADOS" },
];

test.describe("TS-REG | Reglamento", () => {
  /**
   * TC-REG-001 | La pagina carga con sus seis secciones
   * Descripcion: /reglamento renderiza el titulo y las seis secciones de
   *   reglas.
   * Precondiciones: ninguna.
   * Pasos:
   *   1. Ir a /reglamento
   * Resultado esperado: el h1 y los seis subtitulos estan visibles.
   * Tecnica: cobertura de elementos | Prioridad: media
   */
  test("TC-REG-001 | la pagina carga con sus seis secciones", async ({ page }) => {
    await page.goto("/reglamento");

    await expect(page.getByRole("heading", { level: 1, name: "REGLAMENTO" })).toBeVisible();

    for (const seccion of SECCIONES) {
      await expect(page.getByText(seccion.titulo, { exact: true })).toBeVisible();
    }
  });

  /**
   * TC-REG-002 | Los subtitulos entran con la animacion de la pagina
   * Descripcion: los seis subtitulos de seccion usan la misma animacion de
   *   entrada (fadeUp) que el resto de los elementos, con delay escalonado.
   *   Antes aparecian instantaneos mientras sus reglas todavia hacian fade.
   * Precondiciones: ninguna.
   * Pasos:
   *   1. Ir a /reglamento
   *   2. Leer el estilo computado de cada subtitulo
   * Resultado esperado: cada uno tiene animation-name "fadeUp" y un
   *   animation-delay distinto de vacio.
   * Tecnica: verificacion de estado visual | Prioridad: media
   * Ref: TODO.todo -- "Arreglar subtitulos en pagina de reglamento"
   */
  test("TC-REG-002 | los subtitulos entran con la animacion fadeUp", async ({ page }) => {
    await page.goto("/reglamento");

    for (const seccion of SECCIONES) {
      const subtitulo = page.getByText(seccion.titulo, { exact: true });
      await expect(subtitulo).toHaveCSS("animation-name", "fadeUp");
    }
  });

  /**
   * TC-REG-003 | El indice lateral apunta a cada seccion
   * Descripcion: cada link del indice tiene el ancla de su seccion y esa
   *   seccion existe en el documento.
   * Precondiciones: viewport de escritorio (el indice se oculta en mobile).
   * Pasos:
   *   1. Ir a /reglamento
   *   2. Para cada seccion, verificar el link y el destino
   * Resultado esperado: existe un link a #<id> y un elemento con ese id.
   * Tecnica: cobertura de elementos | Prioridad: baja
   */
  test("TC-REG-003 | el indice lateral apunta a cada seccion", async ({ page }) => {
    await page.goto("/reglamento");

    for (const seccion of SECCIONES) {
      await expect(page.locator(`a[href="#${seccion.id}"]`)).toHaveCount(1);
      await expect(page.locator(`#${seccion.id}`)).toHaveCount(1);
    }
  });
});
