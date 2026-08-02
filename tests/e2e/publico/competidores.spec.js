// Suite: competidores (TS-COMP)
// Nivel: sistema / e2e. Cobertura: /competidores y su buscador.
// Tecnica: particion de equivalencia sobre el texto buscado.
// Datos: sembrados por globalSetup -- ver tests/e2e/fixtures/seed.js.
import { test, expect } from "@playwright/test";

import { PREFIJO_JUGADOR, nombreJugador } from "../fixtures/datos.js";

// Clases de equivalencia del buscador:
//   coincidencia exacta  -> aparece ese jugador
//   coincidencia parcial -> aparecen varios
//   sin coincidencias    -> lista vacia, sin error
//   vacio                -> se muestran todos
const CASOS_BUSQUEDA = [
  { clase: "coincidencia exacta", texto: nombreJugador(7), esperaResultados: true },
  { clase: "coincidencia parcial", texto: PREFIJO_JUGADOR, esperaResultados: true },
  { clase: "sin coincidencias", texto: "zzz-no-existe-zzz", esperaResultados: false },
];

test.describe("TS-COMP | Competidores", () => {
  /**
   * TC-COMP-001 | El board lista a los competidores
   * Descripcion: /competidores muestra los jugadores con participaciones
   *   resueltas.
   * Precondiciones: 45 jugadores sembrados con participaciones resueltas.
   * Pasos:
   *   1. Ir a /competidores
   * Resultado esperado: el primer jugador sembrado esta visible.
   * Tecnica: particion de equivalencia (caso feliz) | Prioridad: alta
   */
  test("TC-COMP-001 | el board lista a los competidores", async ({ page }) => {
    await page.goto("/competidores");

    await expect(page.getByText(nombreJugador(1)).first()).toBeVisible();
  });

  for (const caso of CASOS_BUSQUEDA) {
    /**
     * TC-COMP-002 | Buscador con <clase>
     * Descripcion: el buscador filtra el board en vivo.
     * Precondiciones: jugadores sembrados con un prefijo conocido.
     * Pasos:
     *   1. Ir a /competidores
     *   2. Escribir el texto de la clase en el buscador
     * Resultado esperado: hay resultados o la lista queda vacia segun la
     *   clase, sin error en pantalla.
     * Tecnica: particion de equivalencia | Prioridad: media
     */
    test(`TC-COMP-002 | buscar con ${caso.clase}`, async ({ page }) => {
      await page.goto("/competidores");
      await expect(page.getByText(nombreJugador(1)).first()).toBeVisible();

      await page.getByPlaceholder("Buscar nick...").fill(caso.texto);

      // El podio de arriba (campeon + 2do + 3ro) NO se filtra: es el top de la
      // temporada, no un resultado de busqueda. Por eso el caso sin
      // coincidencias se verifica con el mensaje de lista vacia y no contando
      // apariciones del prefijo en toda la pagina.
      if (caso.esperaResultados) {
        await expect(page.getByText(caso.texto).first()).toBeVisible();
      } else {
        await expect(page.getByText(/No encontramos/i)).toBeVisible();
      }
    });
  }
});
