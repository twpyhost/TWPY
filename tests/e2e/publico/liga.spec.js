// Suite: liga publica (TS-LIGA)
// Nivel: sistema / e2e. Cobertura: /liga sin login -- 5 tablas de grupo,
// zona de eliminacion y calendario.
// Datos: siembra su propia liga (fixture real, ver scripts/data/) bajo el
// slug "liga-invitacional-2026" -- el mismo que src/app/liga/page.js lee de
// forma fija (sin selector de liga en la UI, ver el plan). Corre en el
// project "e2e" (sin sesion guardada).
import { test, expect } from "@playwright/test";

import { getServiceClient } from "../../testSupabase.js";
import { sembrarLiga } from "../../../src/lib/ligaSeed.js";
import fixture from "../../../scripts/data/liga-2026-fixture.json" with { type: "json" };

test.describe("TS-LIGA | Liga publica", () => {
  let supabase;
  let ligaId;

  test.beforeAll(async () => {
    supabase = getServiceClient();
    const resumen = await sembrarLiga(supabase, fixture);
    ligaId = resumen.ligaId;
  });

  test.afterAll(async () => {
    // fechas/grupos/participantes/partidos caen por cascade.
    await supabase.from("ligas").delete().eq("id", ligaId);
  });

  /**
   * TC-LIGA-001 | Muestra los 5 grupos y el calendario sin login
   * Descripcion: un visitante anonimo ve las 5 tablas de posiciones y las
   *   12 fechas del calendario.
   * Pasos:
   *   1. Ir a /liga
   * Resultado esperado: los 5 encabezados de grupo y las 12 fechas estan
   *   visibles.
   * Tecnica: caso feliz | Prioridad: alta
   */
  test("TC-LIGA-001 | muestra los 5 grupos y las 12 fechas sin login", async ({ page }) => {
    await page.goto("/liga");

    await expect(page.getByRole("heading", { name: "LIGA", exact: true })).toBeVisible();

    for (let numero = 1; numero <= 5; numero += 1) {
      await expect(page.getByText(`Grupo ${numero}`, { exact: true })).toBeVisible();
    }

    for (let numero = 1; numero <= 12; numero += 1) {
      await expect(page.getByText(`FECHA ${numero}`, { exact: true })).toBeVisible();
    }
  });

  /**
   * TC-LIGA-002 | La zona de eliminacion resalta las ultimas 2 posiciones
   * Descripcion: sin resultados cargados, los 7 participantes del Grupo 1
   *   quedan empatados en 0 puntos y se ordenan por nombre -- las ultimas 2
   *   filas (Slammers, Wario) llevan el tinte de eliminado.
   * Pasos:
   *   1. Ir a /liga
   *   2. Ubicar la fila de "Wario" en la tabla del Grupo 1
   * Resultado esperado: su background-color es el tinte de eliminado
   *   (rgba(230, 0, 0, 0.05)).
   * Tecnica: valor limite (ultima posicion del grupo) | Prioridad: alta
   */
  test("TC-LIGA-002 | la zona de eliminacion resalta las ultimas 2 posiciones", async ({
    page,
  }) => {
    await page.goto("/liga");

    const fila = page.getByRole("row", { name: /Wario/ });
    await expect(fila).toHaveCSS("background-color", "rgba(230, 0, 0, 0.05)");
  });

  /**
   * TC-LIGA-003 | El calendario deriva quien descansa por fecha
   * Descripcion: no hay tabla de descansos -- se deriva del participante
   *   del grupo que no aparece en ninguna pelea de esa fecha.
   * Pasos:
   *   1. Ir a /liga
   * Resultado esperado: la Fecha 1 muestra "Descansa: Joawquer" (el unico
   *   participante del Grupo 1 que no juega esa fecha, ver el fixture).
   * Tecnica: caso feliz sobre un dato derivado | Prioridad: media
   */
  test("TC-LIGA-003 | el calendario muestra quien descansa", async ({ page }) => {
    await page.goto("/liga");

    await expect(page.getByText("Descansa: Joawquer")).toBeVisible();
  });
});
